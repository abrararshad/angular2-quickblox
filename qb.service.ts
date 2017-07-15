import { Injectable, EventEmitter } from '@angular/core';
import { MdDialog, MdDialogConfig } from '@angular/material';
import { Http, RequestOptions, Headers } from '@angular/http';
import { Observable, Subject, BehaviorSubject, ReplaySubject } from 'rxjs';
import * as _ from 'underscore'

import { IQBConfig, QBAppConfigService, QBConnectionConfig } from './qb-config';
import { IQBConnection, IConnectionStates, IConnectivityResponder } from './interfaces';

import { CallEventState,
        OnCallReceive,
        OnCallReject,
        OnRemoteStream,
        OnCallStop,
        OnCallAccept,
        OnCallNotAnswer,
        OnCallStatsReport,
        OnCallUpdate,
        OnDisconnected,
        OnSessionClose,
        OnSessionConnectionStateChanged } from './response-handlers';


export * from './response-handlers';
export * from './interfaces';

declare var QB: any;

@Injectable()
export class QBService{
    private userLogin: string;
    private userPass: string;

    private config: IQBConfig;
    private QBConnectionParams: any;
    private service: any;
    private session: any;

    private emptyCallState: CallEventState;
    public eventListener = new BehaviorSubject<CallEventState>(this.emptyCallState);

    public componentEvents = new Subject();

    public connectionState: IConnectionStates;
    public userConnectivityStatusEmitter: EventEmitter<any> = new EventEmitter<any>();
    //public userConnectivityStatusEmitter = new ReplaySubject<IConnectivityResponder>();

    public test: any;

    public connection: IQBConnection = {
            session: null,
            login: null
    };


    // Status vars
    private videoChatStatus: boolean = true; 
    private videoChatPreviousStatus: boolean = undefined;
    private videoChatWakupSubscriber: any;
    private videoChatConnetivitySubscriber: any;      

    constructor(private dialog: MdDialog,
                private http: Http,
                private QBConfig: QBAppConfigService){

        
        this.QBConnectionParams = QBConnectionConfig.getPramaters();
        QBConfig.getConfig().subscribe(c => {
            this.config = c;
        });
        
        this.QBConnectionParams.on.sessionExpired = (e) => {
            this.emitUserConnectivityStatus('con_session', 'Un-authorization issue', false);
        }        

        this.service = QB;

        this.test = (new Date).getTime();
    }

    public invokeListeners(){
        // let dialogRef;
        this.connectionState = this.service.webrtc.SessionConnectionState;          
        this.attachWebRTCListeners().subscribe(event => {
            this.eventListener.next(event);            
        });

        this.attachDeviceConnectivityEvents();
    }

    attachDeviceConnectivityEvents(){
        window.addEventListener('online',  () => {
            this.emitUserConnectivityStatus('browser_con', 'online', true);
        });
        window.addEventListener('offline', () => {
            this.emitUserConnectivityStatus('browser_con', 'No internet connnectivity', false);
        });
    }

    public bootstrap(username: string, password: string): Promise<IQBConnection>{
        return new Promise(resolve => {
            this.init().then(init => {
                
                this.createSession().then(session => {
                    this.connection.session = session.response;

                    this.login(username, password).then(login => {
                        this.connection.login = login.response;
                        resolve(this.connection);
                    });

                })
            });
        })
    }

    public init(): Promise<any>{
        return new Promise((resolve, reject) => {
            try{
                this.service.init(this.config.appId, this.config.authKey, this.config.secret, this.QBConnectionParams);                                     
                resolve();
            }catch(e) {
                let err = 'Issue connecting with QB service. Error: ' + e;
                this.emitUserConnectivityStatus('con_init', err, false);
                console.log(e);
                reject(e);
            }            
        });
    }    

    public createSession(): Promise<any>{
        return new Promise((resolve, reject) => {
            try{
                this.service.createSession((error, response)=>{
                    let res = {
                        error: error,
                        response: response
                    };
                    if(error) {
                        this.emitUserConnectivityStatus('con_createservice', error, false);
                        reject(res);
                    }else{
                        this.emitUserConnectivityStatus('con_createservice', '', true);
                        resolve(res);
                    }
                });
            }catch(e) {
                console.error('Creating Session Error', e);
                reject(e);
            }
        });
    }

    public login(username: string, password:string): Promise<any>{
        let credentials = {
            login: username,
            password: password
        }
        return new Promise((resolve, reject) => {
            this.service.login(credentials, (error, response) => {
                let res = {
                    error: error,
                    response: response
                };                
                if(error) {
                    this.emitUserConnectivityStatus('con_login', error, false);
                    reject(res);
                }else{
                    this.emitUserConnectivityStatus('con_login', '', true);
                    resolve(res);
                }              
            });            
        })
    }


    public connect(id: number, password: string): Promise<any>{
        let params = {
            userId: id,
            password: password,
            resource: 'Web'
        };

        return new Promise((resolve, reject) => {
            this.service.chat.connect(params, (error, roster)=>{
                let res = {
                    error: error,
                    roster: roster
                };

                if(error) {
                    this.emitUserConnectivityStatus('con_chat_login', error, false);
                    reject(res)
                }else{
                    this.emitUserConnectivityStatus('con_chat_login', '', true);
                    resolve(res);
                }                
            });
        })
    }   

    public attachWebRTCListeners(): Observable<CallEventState>{
        return Observable.create(observer => {
            this.service.webrtc.onCallListener = (session, extension) => {
                let response = new OnCallReceive(session, extension);
                observer.next(response);
            };

            this.service.webrtc.onRejectCallListener = (session, userId, extension) => {
                let response = new OnCallReject(session, userId, extension);
                observer.next(response);
            };     

            this.service.webrtc.onStopCallListener = (session, userId, extension) => {
                let response = new OnCallStop(session, userId, extension);
                observer.next(response);
            };     

            this.service.webrtc.onRemoteStreamListener = (session, userId, stream) => {
                let response = new OnRemoteStream(session, userId, stream);
                observer.next(response);
            };      

            this.service.webrtc.onCallStatsReport = (session, userId, stats, error) => {
                let response = new OnCallStatsReport(session, userId, stats, error);
                observer.next(response);
            };    

            this.service.webrtc.onSessionCloseListener = (session) => {
                let response = new OnSessionClose(session);
                observer.next(response);
            }; 

            this.service.webrtc.onUserNotAnswerListener = (session, userId) => {
                let response = new OnCallNotAnswer(session, userId);
                observer.next(response);
            };

            this.service.webrtc.onUpdateCallListener = (session, userId, extension) => {
                let response = new OnCallUpdate(session, userId, extension);
                observer.next(response);
            };  

            this.service.webrtc.onSessionConnectionStateChangedListener = (session, userId, connectionState) => {
                let response = new OnSessionConnectionStateChanged(session, userId, connectionState);
                observer.next(response);
            };   

            this.service.webrtc.onDisconnectedListener = () => {
                let response = new OnDisconnected();
                observer.next(response);
            };                                                                                         

        });                
    }

    disconnect(){
        try{
            let api = 'https://'+this.QBConnectionParams.endpoints.api+'/login.json';

            let requestOptions = new RequestOptions();

            requestOptions.headers = new Headers({
                'content-type' : 'application/json',
                'QB-Token': this.connection.session.token
            });
            
            this.http.delete(api, requestOptions).subscribe();

            // disconnect from services
            this.service.chat.disconnect();
            // this.service.logout();
            // this.service.destroySession();

        }catch(e) {
            console.trace('QB disconnect ', e);
        }
    }

    emitUserConnectivityStatus(type?: string, detail?: string, status?: boolean){
        this.userConnectivityStatusEmitter.emit({
            type: type,
            detail: detail,
            status: status
        });
    }

    initiateComponent(){
        this.eventListener.subscribe(event => {
            if(event instanceof OnCallReceive){
                this.componentEvents.next(true);
            }
        });

         this.invokeListeners();
    }    

    initVideoChatEssentials(login: string, pass: string){
        this.userLogin = login;
        this.userPass = pass;  

        this.bootstrap(login, pass).then(connection => {  
            // Sign into chat for signaling purpose
            this.connect(connection.login.id, pass).then(con => {
            });

            this.initiateComponent();
        });

        if(!_.isUndefined(this.videoChatConnetivitySubscriber)) {
            this.videoChatConnetivitySubscriber.unsubscribe();
            this.videoChatPreviousStatus = false;
        }

        this.videoChatConnetivitySubscriber = this.userConnectivityStatusEmitter.subscribe(data => {
            if(data.type == 'general')
                return;

            if(!data.status) {
                if(!data.status && data.type !== 'con_chat_login') {
                    this.videoChatStatus = false;

                    if(data.type == 'browser_con'){
                        this.videoChatConnetivitySubscriber.unsubscribe();
                        this.browserOnlineListener();
                    }
                }
            }

            if(this.videoChatPreviousStatus == this.videoChatStatus)
                return;

            if(this.videoChatStatus){
                this.emitUserConnectivityStatus('general', data.detail, true);
                console.log('Status: Online', data);
            }else{
                this.emitUserConnectivityStatus('general', data.detail, false);
                console.error('Status: Offline', data);
            }      

            this.videoChatPreviousStatus = this.videoChatStatus;
        });
  }

  browserOnlineListener(){
      this.videoChatWakupSubscriber = this.userConnectivityStatusEmitter.subscribe(data => {
        
        if(data.type == 'general')
            return;

        if(!this.videoChatStatus) {
            if(data.status && data.type !== 'con_chat_login') {
                this.videoChatStatus = true;

                this.videoChatWakupSubscriber.unsubscribe();

                // Once status is alive, run essential again
                this.initVideoChatEssentials(this.userLogin, this.userPass);
            }
        }        
      });
  }      
}