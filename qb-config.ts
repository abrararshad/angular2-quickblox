import { Injectable } from '@angular/core';
import { Observer, Observable, Subject, ReplaySubject} from 'rxjs';

export interface IQBConfig{
    appId: number;
    authKey: string;
    secret: string;
    user_prefix: string;
}

const Production: IQBConfig = {    
    appId: null,
    authKey: '',
    secret: '',
    user_prefix: ''
};

const Development: IQBConfig = {    
    appId: null,
    authKey: '',
    secret: '',
    user_prefix: ''
};

const Stagging: IQBConfig = {    
    appId: null,
    authKey: '',
    secret: '',
    user_prefix: ''
};

@Injectable()
export class QBAppConfigService{
    private config = new ReplaySubject();
    private useConfig;

    private configs = {
        'PROD': Production,
        'DEV': Development,
        'STAGE': Stagging
    };

    constructor(){
        this.config.subscribe( c => this.useConfig = c);
    }

    public getConfig(): Observable<IQBConfig>{
        return Observable.create(observer => {
            let config = this.configs[this.useConfig] || this.configs["PROD"];
            observer.next(config);
        })
    }

    public setEnv(env){
        this.config.next(env);
    }
}

export class QBConnectionConfig{
    static getPramaters(){
        return  {
                endpoints: {
                    api: "",
                    chat: "", 
                    muc: "",
                    turn: ""
                },
                chatProtocol: {
                    websocket: "", 
                    active: 2
                },
                debug: false,
                webrtc: {
                    answerTimeInterval: 60,
                    dialingTimeInterval: 5,
                    disconnectTimeInterval: 30,
                    statsReportTimeInterval : true,
                    
                    chatAutoReconnectEnabled: true,
                    networkIndicatorEnabled: true,
                    streamSendMessageTimout: 0,
                    reconnectTimeInterval: 10,
                    keepAliveInterval: 20,
                    iceServers: [
                        {
                            'url': 'stun:stun.l.google.com:19302'
                        }
                    ]                                        
                },
                on: {
                    sessionExpired: function(e){
                        console.log('QB session expired');
                    }
                }            
        }
    }

}
