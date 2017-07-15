import { Observable } from 'rxjs';
declare var QB: any;

interface CallReceiveResponse{
    session: any;
    extension: any;
}

interface CallResponse{
    session: any;
    extension: any;
    userID: any;
}

interface CallStatsReportResponse{
    session: any;
    userID: any;
    stats:any;
    error: any;
}

interface CallNotAnswereResponse{
    session: any; 
    userID: any;
}

interface StreamResponse{
    session: any;
    userID: any;
    stream: any;
}

interface SessionResponse{
    session: any;
}

interface SessionConnectionResponse{
    session: any;
    userID: any; 
    connectionState: any;
}

export class helper{
    static getConnectionStateName(num){
        let state;
        switch (num) {
            case QB.webrtc.SessionConnectionState.FAILED:
                state = 'FAILED';
                break;            
            case QB.webrtc.SessionConnectionState.DISCONNECTED:
                state = 'DISCONNECTED';
                break;            
            case QB.webrtc.SessionConnectionState.CLOSED:
                state = 'CLOSED';
                break;
            case QB.webrtc.SessionConnectionState.CONNECTED:                
                state = 'CONNECTED';
                break;            
            case QB.webrtc.SessionConnectionState.COMPLETED:
                state = "COMPLETED";
                break;
            case QB.webrtc.SessionConnectionState.CONNECTING:                
                state = "CONNECTING";
                break;
            case QB.webrtc.SessionConnectionState.UNDEFINED:                
                state = "UNDEFINED";
                break;
            default:
                state = 'CONNECTING';
        }

        return state;
    }
}

export class OnCallReceive implements CallReceiveResponse{

    constructor(public session: any, public extension: any){}

    public accept(localVideo): Observable<any>{
        let isAudio = this.session.callType === QB.webrtc.CallType.AUDIO,
            mediaParams = this.getMediaParams(isAudio, localVideo);

        return Observable.create(observer => {
            this.session.getUserMedia(mediaParams, (err, stream) => {
                
                if ( err || !stream.getAudioTracks().length || (isAudio ? false : !stream.getVideoTracks().length) ) {    
                    let errorMsg = 'device_problem'; 
                    observer.next(errorMsg);
                    this.session.stop({});
                } else {
                    let opponents = this.getOpponents();
                    let response = {
                        opponents: opponents,
                        localStream: stream
                    }
                    observer.next(response);

                    if(this.session.state !== QB.webrtc.SessionConnectionState.CLOSED){
                        try{
                            this.session.accept({});
                        }catch(e) {
                            console.log('Connection issue while accepting the call ', e);
                            observer.next(e);
                        }
                    } 
                }            
            });   
        })      
    }

    private getOpponents(){
        let opponents = [this.session.initiatorID],
            opponentsStat = [];

        this.session.opponentsIDs.forEach((userID, i, arr) => {
            if(userID != this.session.currentUserID){
                opponents.push(userID);
            }
        });

        opponents.forEach((userID, i, arr) => {
            let peerState = this.session.connectionStateForUser(userID),
                userInfo = this.extension.userInfo;

            let state = {
                'userID': userID,
                'name': userInfo ? userInfo.username : userID,
                'state': helper.getConnectionStateName(peerState)                      
            }
            
            opponentsStat.push(state);
        });
        
        return opponentsStat;
    }    

    private getMediaParams(isAudio: boolean, localVideo: string): Object{
        let mediaParams = {};
        if(isAudio){
            mediaParams = {
                audio: true,
                video: false
            };
        } else {
            mediaParams = {
                audio: true,
                video: true,
                elemId: localVideo,
                options: {
                    muted: false,
                    mirror: true
                }
            };
        }

        return mediaParams;
    }

}

export class OnCallReject implements CallResponse{
    constructor(public session: any, public userID: any, public extension: any){}
}
export class OnCallStop implements CallResponse{
    constructor(public session: any, public userID: any, public extension: any){}
}

export class OnCallAccept implements CallResponse{
    constructor(public session: any, public userID: any, public extension: any){}
}

export class OnCallUpdate implements CallResponse{
    constructor(public session: any, public userID: any, public extension: any){}
}

export class OnCallStatsReport implements CallStatsReportResponse{
    constructor(public session: any, public userID: any, public stats: any, public error: any){}
}

export class OnCallNotAnswer implements CallNotAnswereResponse{
    constructor(public session: any, public userID: any){}
}

export class OnRemoteStream implements StreamResponse{
    constructor(public session: any, public userID: any, public stream: any){}
}

export class OnSessionClose implements SessionResponse{
    constructor(public session: any){}
}

export class OnSessionConnectionStateChanged implements SessionConnectionResponse{
    constructor(public session: any, public userID: any, public connectionState: any){
    }
}

export class OnDisconnected{
    
}

export type CallEventState = OnCallReceive | OnCallStop | OnCallAccept | OnCallUpdate | OnCallStatsReport 
                    | OnCallNotAnswer | OnRemoteStream | OnSessionClose | OnSessionConnectionStateChanged
                    | OnDisconnected;

