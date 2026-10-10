export interface UserPublicResponse {
	id: number;
	username: string;
}

export interface UserPrivateResponse extends UserPublicResponse {
	email: string;
}

export interface LoginUserRequest {
	username: string;
	password: string;
}

export interface LoginUserResponse {
	access_token: string;
	refresh_token: string;
	token_type: string;
}

export interface RegisterUserRequest {
    email: string;
    username: string;
    password: string;
}
