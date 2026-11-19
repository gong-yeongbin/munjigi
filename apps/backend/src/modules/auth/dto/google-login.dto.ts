import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class GoogleLoginDto {
	@ApiProperty({ description: 'Google Identity Services가 발급한 ID 토큰(JWT)', example: 'eyJhbGciOiJSUzI1NiIs...' })
	@IsString()
	@IsNotEmpty()
	id_token: string;

	@ApiPropertyOptional({ description: '첫 로그인(가입) 때 같이 만드는 프로젝트의 이름. 없으면 default. 이미 가입한 계정이면 무시한다', maxLength: 100, example: 'shop' })
	@IsOptional()
	@IsString()
	@MaxLength(100)
	project_name?: string;
}

export class AccessTokenDto {
	@ApiProperty({ description: 'munjigi access JWT. 만료 7일. Authorization: Bearer로 보낸다', example: 'eyJhbGciOiJIUzI1NiIs...' })
	access_token: string;
}
