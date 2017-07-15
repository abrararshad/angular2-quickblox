# angular2-quickblox
Angular 2 module for QuickBlox. It can only receive group or single call for now and displays recipients' and local's stream in in a popup, calling other parties could be added with little more code. (no chating functionality so far). 

# Config
Add your parameters/config in qb-config.ts

# Initialization

Include QuickBlox SDK. Adding it as NPM package causes issues
```
<script src="https://cdnjs.cloudflare.com/ajax/libs/quickblox/2.6.0/quickblox.min.js"></script>   
```

Place it somewhere in the component's HTML file
```
<app-video-chat></app-video-chat>
```

Init through the service
```
this.videoChatService.initVideoChatEssentials(login, pass);
```

# Initialization - complete code example
```
 private qbConfig: any;
 public videoChatStatus: boolean = false; 
 public videoChatStatusDesc: string;
 private videChatStatusSubscriber: any;
 private userLoginStatusEmitter: any;
 private isVideoInited: boolean = false;
 public statusText: string = 'Offline';
  
 constructor( 
   private userService: UserService, 
   private videoChatService: QBService,
   private qbConfigService: QBAppConfigService) {

   qbConfigService.getConfig().subscribe(c => {
     this.qbConfig = c;    
   });        
    
 }
 initVideoChat(){
    if(this.isVideoInited)
      return;

    this.isVideoInited = true;

    let login = this.qbConfig.user_prefix + this.userService.getUser().username;
    let pass = this.userService.getUser().im_hash;

    this.videoChatService.initVideoChatEssentials(login, pass);
    this.videoChatConnectivityStatus();
  }    

  videoChatConnectivityStatus(){
    if(!_.isUndefined(this.videChatStatusSubscriber)) {
      this.videChatStatusSubscriber.unsubscribe();
    }

    this.videChatStatusSubscriber = this.videoChatService.userConnectivityStatusEmitter.subscribe(data => {
      if(data.type !== 'general')
        return;

      if(!data.status) {
        this.videoChatStatus = false;

        let message = data.detail;
        if(!_.isUndefined(data.detail.message)) {
          message =  data.detail.message;
        }

        this.videoChatStatusDesc = message;
        this.statusText = 'Offline. ' + message;
      }else{
        this.statusText = 'Online';
        this.videoChatStatus = true;
        this.videoChatStatusDesc = 'You are online and can receive video calls.';
      }

    });
  }
  ```
