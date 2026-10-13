export interface PublicUserData {
	id: number;
	username: string;
}

export interface PrivateUserData extends PublicUserData {
	email: string;
}

export interface GetUserResponse extends PublicUserData {}

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

export interface RegisterUserResponse extends PrivateUserData {}
