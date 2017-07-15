export interface IConnectionStates{
    UNDEFINED: any;
    CONNECTING: any;
    CONNECTED: any;
    FAILED: any;
    DISCONNECTED: any;
    CLOSED: any;
    COMPLETED: any;    
}

export interface ISession{
    application_id: number
    created_at: Date,
    id: number;
    nonce: number
    token: string
    ts: string;
    updated_at: Date;
    user_id: number
    _id: number
}

export interface ILogin{
    blob_id: number;
    created_at: Date,
    custom_data: JSON | any,
    email: string
    external_user_id: number;
    facebook_id: number;
    full_name: string;
    id: number;
    last_request_at: Date,
    login: string
    owner_id: number;
    phone: string;
    twitter_digits_id: number
    twitter_id: number
    updated_at: Date,
    user_tags: string;
    website: string;
}

export interface IQBConnection{
    session: ISession | null; 
    login: ILogin | null; 
}

export interface IOpponent{
    userID: number;
    name: string;
    state: string;
    detail: IQBUser;
}

export interface IQBUser{
    blob_id: number;
    created_at: Date;
    custom_data: any;
    email: any;
    external_user_id: number;
    facebook_id: any;
    full_name: string;
    id: number;
    last_request_at: Date;
    login: string;
    owner_id: number;
    phone: string;
    twitter_digits_id: any;
    twitter_id: string
    updated_at: Date;
    user_tags: any;
    website: string;
}

export interface IConnectivityResponder{
    type: string;
    detail: any;
    status: boolean;
}