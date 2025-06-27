import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto): Promise<{
        message: string;
        user: {
            id: any;
            username: any;
            firstName: any;
            lastName: any;
        };
    }>;
}
