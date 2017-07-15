import { Component, HostBinding, OnInit, OnDestroy, ViewChild, ElementRef, EventEmitter } from '@angular/core';
import { MdDialogRef } from '@angular/material';
import * as jQuery from 'jquery';
import * as _ from 'underscore';
import * as screenfull from 'screenfull';

import { InnerPageAnimation } from '../../animations';

import {
        QBService, 
        CallEventState,
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
        OnSessionConnectionStateChanged,
        helper
 } from './qb.service';

import { QBusersService } from './qb-users.service';

import { IOpponent } from './interfaces';

export interface Size{
    width: any;
    height: any
}

declare var QB: any;

@Component({
    selector: 'app-video-chat',
    moduleId: module.id,
    templateUrl: './video-chat.component.html',
    styleUrls: [ './video-chat.component.scss' ],
    animations: [ InnerPageAnimation ]
})
export class VideoChatComponent implements OnInit, OnDestroy{
    @ViewChild('overlay') overlayRef: ElementRef;
    @ViewChild('mainContainer') mainContainerRef: ElementRef;
    @ViewChild('videoContainer') containerRef: ElementRef;
    @ViewChild('inComingCallRing') ringInComingRef: ElementRef;
    @ViewChild('callDroppedRing') ringCallDroppedRef: ElementRef;
    @ViewChild('fullScreenContainer') fullScreenContainerRef: ElementRef;
    @ViewChild('opponentList') opponentListRef: ElementRef;

    public event: any;
    public currentSession: any;

    public caller: any;
    public isCallComing: boolean = false;
    public isCallInProgress: boolean = false;
    public callEnded: boolean = false; 
    
    public opponents: Array<IOpponent>;
    public opponentsDetailsFetched: EventEmitter<any> = new EventEmitter<any>();
    public rtcListenerSubcription: any = null;
    public errorOccurred: boolean = false;

    private overlay: any;
    private mainContainer: any;

    public remoteVideoWidth: any;
    private windowResizerNoitifier = new EventEmitter();

    public streams = {};
    public localStream: any;

    public selectedStream: any | number = undefined; // holds by userID in case of number
    public selectedStreamUser: any = null;

    public isFullscreen: boolean = false;

    public callTime: Date;

    public mutes = {
        audio: {
            status: false,
            on: 'mic',
            off: 'mic_off',
            icon: 'mic'
        },
        video: {
            status: false,
            on: 'videocam',
            off: 'videocam_off',
            icon: 'videocam'
        },
        speakers: {
            status: false,
            on: 'volume_up',
            off: 'volume_off',
            icon: 'volume_up'
        },                
    }    

    constructor(private serviceManager: QBService,
                private usersService: QBusersService) {
    }

    ngOnInit(){
        this.mainContainer = jQuery(this.mainContainerRef.nativeElement);
        this.overlay = jQuery(this.overlayRef.nativeElement);
        
        this.rtcListenerSubcription = this.serviceManager.eventListener.subscribe(event => {
            this.attachListeners(event);
            
            if(!(event instanceof OnCallStatsReport)) {
                this.windowResizerNoitifier.emit(this.getWindowSize());
            }
        });                    

        this.attachSubscriptions();
    } 

    attachListeners(event){
        this.event = event;
    
        if(event instanceof OnCallReceive) {
            this.currentSession = event;
            this.caller = event.extension.userInfo.username;

            try{
                this.ringInComingRef.nativeElement.play();
            }catch(e) {
               console.log('Incoming call audio ', e);
            }

            this.isCallComing = true;
            this.callEnded = false;
            this.selectedStream = null;
        }

        if(event instanceof OnSessionClose) {
            this.endSession();
        }

        if(event instanceof OnCallStop || event instanceof OnCallNotAnswer) {
            this.opponentLeftStream(event.userID);
        }

        if(event instanceof OnSessionConnectionStateChanged) {
            let state = helper.getConnectionStateName(event.connectionState);

            if(event.session.state == this.serviceManager.connectionState.COMPLETED) {
                state = helper.getConnectionStateName(this.serviceManager.connectionState.CONNECTED);
            }

            this.updateOpponentsState([event.userID], state);

            if(event.session.state == this.serviceManager.connectionState.CONNECTED) {
                console.log('Session connected ', event.session);
                this.attachStreamToSession('remoteVideo_'+event.userID, event.userID);                 

                if(!this.selectedStream) {
                    this.switchBig(event.userID);
                }

                setTimeout(()=>{
                    this.positionDialogs();
                }, 50);

                this.generateSnackStatusMessage(event.userID, 'has been connected');

            }

            if(event.session.state == this.serviceManager.connectionState.DISCONNECTED ||
                event.session.state == this.serviceManager.connectionState.CLOSED) {
                this.opponentLeftStream(event.userID);
            }
        }

        if(event instanceof OnRemoteStream) {
            _.map(this.opponents, p => {
                if(event.userID == p.userID) {
                    this.streams[event.userID] = event.stream;                              
                }
                this.windowResizerNoitifier.emit(this.getWindowSize());
            });                
        }    
    }        

    opponentLeftStream(id: number){
        if(this.isCallInProgress) {
            this.generateSnackStatusMessage(id, ' has left');
        }else{
            
        }
        this.removeOpponent(id);
        this.switchBig();            
    }

    generateSnackStatusMessage(id: number, message: string){
        let opponent: IOpponent = this.getOpponentDetail(id);
        if(opponent && _.has(opponent, 'detail')){
            let m = opponent.detail.full_name+ ' ' + message;
            
            /**
             * Use your services to display the message here
             */
            console.log('Message', m);
        }        
    }

    attachSubscriptions(){
        this.serviceManager.componentEvents.subscribe(event => {
            this.openDialog();
        });

        this.windowResizerNoitifier.subscribe(size => {
            this.positionDialogs(size);
        });        

        jQuery(window).resize(() => {
            this.windowResizerNoitifier.emit(this.getWindowSize());
        });

        this.windowResizerNoitifier.emit(this.getWindowSize());

        screenfull.onchange(() => {
            this.isFullscreen = screenfull.isFullscreen;

            this.OnScreenAdjustment();
        });    

        this.opponentsDetailsFetched.subscribe(() => {
            this.selectUsernameForDispaly();
        });            
    }


    removeOpponent(id){
        let opponent = _.find(this.opponents, {userID: id});
        if(opponent) {
            this.opponents = _.filter(this.opponents, (o) => {
                return !(o.userID == opponent.userID);
            });

            delete this.streams[opponent.userID];

            if(this.opponents.length < 1) {
                this.endSession();
            }
        }
    }    

    attachStreamToSession(id, userID?: number, stream?: any, event?: any){
        try{
            if(!_.isUndefined(event) && !_.isNull(event)) {
                var state = this.currentSession.session.connectionStateForUser(event.userID),
                    peerConnList = this.serviceManager.connectionState;

                if(state === peerConnList.DISCONNECTED || 
                    state === peerConnList.FAILED || 
                    state === peerConnList.CLOSED) {
                    
                    return false;
                }

                this.currentSession.session.peerConnections[event.userID].stream = stream;
            }

            if(!_.isUndefined(userID) && !_.isNull(userID)) {
                stream = _.find(this.streams, (s, k) => {
                    return userID == k;
                });
            }

            if(stream){
                this.currentSession.session.attachMediaStream(id, stream);
            }

        }catch(e) {
            console.log('Stream could not be added', e);
        }
    }

    updateOpponentsState(ids?: Array<number>, state?: any){
        let newOppoents = [];

        // In case of group call, current users's ID may be included 
        // in the sessions.opponentsIDs, so remove it from there
        this.opponents = _.reject(this.opponents, (o) => {
            return o.userID == this.serviceManager.connection.login.id;
        });

        if(ids.length > 0 && state) {
            this.opponents = _.map(this.opponents, (v, k) => {
                let userID = _.find(ids, id => {
                    return id == v.userID;
                });
                
                if(userID){
                    this.opponents[k].state = state;
                }

                if(_.isUndefined(v['detail'])) {
                    newOppoents.push(v.userID);
                }
                
                return v;
            });        
        }

        if(newOppoents.length > 0) {
            this.updateApponentDetails(newOppoents);
        }
    }

    updateApponentDetails(ids?: Array<number>){
        if(_.isUndefined(ids)) {
            ids = _.pluck(this.opponents, 'userID');
        }
        
        this.usersService.getUsers(ids).subscribe(users => {
            users.map(u => {
                let opponentIndex = _.indexOf(_.pluck(this.opponents, 'userID'), u.id);
                this.opponents[opponentIndex].detail = u; 
            });

            this.opponentsDetailsFetched.emit();
        });     
    }

    acceptCall(type?: string){
        if(!this.isCallInProgress) {
            this.ringInComingRef.nativeElement.pause();
            
            this.currentSession.accept('localVideo').subscribe(response => {
                if(_.isString(response)) {
                    this.errorOccurred = true;
                    console.log('Error ', response);
                    this.endSession();
                }else{
                    this.opponents = response.opponents;
                    this.localStream = response.localStream;
                    
                    this.updateApponentDetails();
                    this.callTime = new Date(this.currentSession.session.startCallTime);

                    if(!_.isUndefined(type) && type == 'audio') {
                        this.mute('video');
                    }
                }
            });

            this.isCallInProgress = true;
            this.isCallComing = false;

            this.positionDialogs(null, 1, true);
                      
        }
    }

    endCall(){        
        this.endSession();
    }

    endSession(){
        this.callEnded = true;

        if(_.isUndefined(this.containerRef)) {
            try{
                this.stopCallingSession();
                this.closeDialog();
            }catch(e) {
                console.log('Connection interruption', e);
            }
            return;
        }

        const container = this.containerRef.nativeElement,
            c = this;

        jQuery(container).find("video").each(function(){
            let t =  jQuery(this);
            
            c.currentSession.session.detachMediaStream(t.attr('id'));
            t.attr('src', '');
        });

        this.stopCallingSession();

        if(!this.errorOccurred) {
            this.closeDialog();            
        }else{
            console.log('Dialog was not closed')
        }
    }

    stopCallingSession(){
        if(this.isConnectionSafeToClose()) {
            try{
                if(this.isCallInProgress) {
                    console.log('Call was stopped');
                    this.currentSession.session.stop({}); 
                }else{
                    console.log('Call was rejected');
                     this.currentSession.session.reject({});
                    // reject() method does not seem to be supported
                    //this.currentSession.session.stop({});
                }
            }catch(e) {
                console.log('Call could not be stopped', e);
            }
        }

        this.ringInComingRef.nativeElement.pause();

        try{
            this.ringCallDroppedRef.nativeElement.play();           
        }catch(e) {
            console.log('Drop call ring ', e);
        }

        this.isCallInProgress = false;       
        this.isCallComing = false;   
    }

    isConnectionSafeToClose(){
        if(!this.event)
            return;

        return (this.event.session.state != this.serviceManager.connectionState.CLOSED
                && this.event.session.state != this.serviceManager.connectionState.DISCONNECTED);
    }

    switchBig(id?: number, which?: string){
        if(!this.isCallInProgress){
            return;
        }

        let stream: any;

        if(which == 'local') {
            stream = this.localStream;
            this.selectedStream = 'local';
            this.selectedStreamUser = 'You';
        }else{
            if(!_.isUndefined(id)) {
                stream = _.find(this.streams, (s, k) => {
                    this.selectedStream = k;
                
                    return id == k;
                });
            }else{
                if(Object.keys(this.streams).length > 0) {
                    this.selectedStream = Object.keys(this.streams)[0];
                    stream = _.first(_.values(this.streams));
                }
            }
        }
        
        if(stream){
            this.attachStreamToSession('remoteVideo_big', null, stream);
        }

        this.selectUsernameForDispaly();
    }

    selectUsernameForDispaly(){
        if(this.selectedStream == 'local') {
            this.selectedStreamUser = 'You';
        }else if(this.selectedStream){
            let opponent: IOpponent = _.findWhere(this.opponents, {userID: +this.selectedStream});
            if(opponent && _.has(opponent, 'detail')) {
              this.selectedStreamUser = opponent.detail.full_name;
            }
        }          
    }    

    openDialog(){
        this.overlay.fadeIn(100, ()=>{
            this.mainContainer.fadeIn(100);        
        })
    }

    closeDialog(){
        setTimeout(()=>{
            this.dismissDialog();        
        }, 1);
    }     

    dismissDialog(){
        this.mainContainer.fadeOut(100, ()=>{
            this.overlay.fadeOut(100);        
        });                    
    }

    getWindowSize(): Size{
        let height = jQuery(window).height(),
            width = jQuery(window).width(),
            params: Size = {height: height, width: width};

         return params;   
    }

    positionDialogs(size?: Size, retried?: number, once: boolean = false){
        if(!size)
            size = this.getWindowSize();

        this.mainContainer.removeClass('hidden');

        (e=> {
            let H = e.innerHeight(), 
                W = e.innerWidth(),
                isSmallScreen =  size.width <= 768;
            
            if(this.isCallInProgress) {
                W = (isSmallScreen? size.width : size.width * .80);
                H = size.height < 100 ? 400 : size.height * .80;

                e.width(W); e.height(H);

                if(this.isCallInProgress) {
                    //e.height('auto');
                }
            }else{
                e.css('width', 'auto'); e.css('height', 'auto');
            }
            
            if(W > 0 || H > 0) {
                let left = (size.width - W) / 2,
                top = (size.height - H) / 2;

                if(this.isCallInProgress) {
                    if(once){
                        e.css('left', isSmallScreen? 0 :left); e.css('top', top);
                    }
                }else{
                    e.css('left', isSmallScreen? 0 :left); e.css('top', top);
                }
            }
        }) (this.mainContainer);

        this.OnScreenAdjustment();

        if(retried < 1 || _.isUndefined(retried)) {
            setTimeout(()=>{
                this.positionDialogs(size, 1);
            },1);
        }               
    
    } 

    getOpponentDetail(id: number): IOpponent{
        return _.findWhere(this.opponents, {userID: +id});        
    }     

    OnScreenAdjustment(){
        if(this.isCallInProgress) {

            let H = 0, W = 0;
            if(this.isFullscreen){
                H = this.getWindowSize().height;
                W = this.getWindowSize().width;
            }else{
                H = this.mainContainer.innerHeight() - jQuery('.window-bar').height() - 10;
                W = this.mainContainer.innerWidth();
            }

            if(W <= 780) {
                jQuery('#remoteVideo_big').width('100%').height('auto');

                let winH = this.getWindowSize().height;
                this.mainContainer.height(winH).width('100%')
                    .css('top', 0).css('overflow-y', 'scroll').css('left', 0);

            }else{
                jQuery('#remoteVideo_big').height(H);
            }
            
            if(this.opponentListRef) {
                let oppoListEle =  jQuery(this.opponentListRef.nativeElement);     
                let combo_size = 0;

                if(oppoListEle.find("video").length > 1) {
                    oppoListEle.find(".opponent-box").each(function(){
                        combo_size += jQuery(this).height() + 25;
                    });
                    
                    if(combo_size >= H) {
                        oppoListEle.height(H).css('overflow-y', 'scroll');
                    }else{
                        oppoListEle.height('auto').css('overflow', 'hidden');
                    }
                }
            }            
        } 
    } 

    mute(type){
        if(!_.isUndefined(this.mutes[type])) {
            let mute = this.mutes[type];
            if(mute.status) {
                this.currentSession.session.unmute(type);
                this.mutes[type].icon = this.mutes[type].on;
            }else{
                this.currentSession.session.mute(type);
                this.mutes[type].icon = this.mutes[type].off;
            }

            this.mutes[type].status = !this.mutes[type].status;
        }
    }

    muteSpeakers(){
        let status = this.mutes['speakers'].status;
        
        jQuery('video').each(function(){
            jQuery(this).prop('muted', !status);
        });

        if(status){
            this.mutes['speakers'].icon = this.mutes['speakers'].on;
        }else{
            this.mutes['speakers'].icon = this.mutes['speakers'].off;
        }        

        this.mutes['speakers'].status = !this.mutes['speakers'].status;
    }    

    fullscreen(action: string){
        if (screenfull.enabled) {
            if(action == 'on') {
                screenfull.request(this.fullScreenContainerRef.nativeElement);
            }else{
                screenfull.exit();
            }
        }
    }      

    isFullScreenSupported(){
        return document.fullscreenEnabled || document.webkitFullscreenEnabled;
    }

    drag(e){
        let left = e.clientX - this.mainContainerRef.nativeElement.offsetLeft,
            top = e.clientY - this.mainContainerRef.nativeElement.offsetTop;     

        jQuery(document).bind('mousemove', jQuery.proxy(this.dragContainer, this, left, top));        
    }

    drop(){
        jQuery(document).unbind('mousemove', this.dragContainer)
    }

    dragContainer(left, top, event){
        let pX = event.clientX - left, 
            pY = event.clientY - top;

        this.mainContainer.css('left',  pX).css('top', pY);
    }   

    ngOnDestroy(){
        this.rtcListenerSubcription.unsubscribe();
        this.rtcListenerSubcription = null;

        this.endSession();
    }
}
