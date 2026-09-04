import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { RefreshTokenService } from './refresh-token.service';
import { SupabaseService } from '../supabase/supabase.service';
import { AuditService } from '../audit/audit.service';

// A minimal stand-in for the Supabase query builder. Every chain method
// returns the same object; terminal reads (maybeSingle/single) and a bare
// `await` on the chain each consume the next result from a FIFO queue that
// the test primes. rotate() makes several from() calls in a known order,
// so priming the queue in that order is enough.
function makeSupabaseMock() {
  const results: Array<{ data: unknown; error: unknown }> = [];
  const take = () =>
    results.length ? results.shift()! : { data: null, error: null };

  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'is', 'update', 'insert', 'order', 'range']) {
    builder[m] = jest.fn(() => builder);
  }
  builder.maybeSingle = jest.fn(() => Promise.resolve(take()));
  builder.single = jest.fn(() => Promise.resolve(take()));
  // makes the chain awaitable for calls that don't end in maybeSingle/single
  builder.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(take()).then(resolve, reject);

  const from = jest.fn(() => builder);
  return {
    service: { client: { from } } as unknown as SupabaseService,
    queue: (...r: Array<{ data: unknown; error: unknown }>) => results.push(...r),
    from,
  };
}

describe('RefreshTokenService.rotate', () => {
  let service: RefreshTokenService;
  let supa: ReturnType<typeof makeSupabaseMock>;
  let audit: { record: jest.Mock };

  const future = new Date(Date.now() + 60_000).toISOString();
  const past = new Date(Date.now() - 60_000).toISOString();

  beforeEach(async () => {
    supa = makeSupabaseMock();
    audit = { record: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        { provide: SupabaseService, useValue: supa.service },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = moduleRef.get(RefreshTokenService);
  });

  it('rotates a valid unexpired token: new token issued, no audit', async () => {
    supa.queue(
      { data: { id: 1, user_id: 7, revoked_at: null, expires_at: future }, error: null }, // initial select
      { data: [{ id: 1 }], error: null }, // atomic claim
      { data: { id: 99 }, error: null }, // insert new row
      { data: null, error: null }, // set replaced_by_id
    );

    const result = await service.rotate('some-token');

    expect(result.userId).toBe(7);
    expect(typeof result.token).toBe('string');
    expect(result.token.length).toBeGreaterThan(20);
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('detects reuse of a revoked token: revokes all + audits + 401', async () => {
    supa.queue(
      { data: { id: 5, user_id: 7, revoked_at: past, expires_at: future }, error: null }, // initial select -> already revoked
      { data: null, error: null }, // revokeAllForUser
    );

    await expect(service.rotate('stolen-token', '203.0.113.5')).rejects.toThrow(
      UnauthorizedException,
    );

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'token.reuse_detected',
        actorId: 7,
        ip: '203.0.113.5',
      }),
    );
  });

  it('rejects an unknown token with 401', async () => {
    supa.queue({ data: null, error: null }); // initial select -> no row

    await expect(service.rotate('nope')).rejects.toThrow('Invalid refresh token');
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('rejects an expired token with 401', async () => {
    supa.queue({
      data: { id: 2, user_id: 7, revoked_at: null, expires_at: past },
      error: null,
    });

    await expect(service.rotate('old')).rejects.toThrow('expired');
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('rejects when the atomic claim loses the race (0 rows updated)', async () => {
    supa.queue(
      { data: { id: 3, user_id: 7, revoked_at: null, expires_at: future }, error: null },
      { data: [], error: null }, // claim updated nothing
    );

    await expect(service.rotate('racing')).rejects.toThrow('already used');
  });

  it('surfaces a DB error on the initial lookup', async () => {
    supa.queue({ data: null, error: { message: 'connection reset' } });

    await expect(service.rotate('x')).rejects.toThrow('connection reset');
  });
});
