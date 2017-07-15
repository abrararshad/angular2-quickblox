import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@angular/material';

import { VideoChatComponent } from './video-chat.component';

import { QBService } from './qb.service';
import { QBusersService } from './qb-users.service';
import { QBAppConfigService } from './qb-config';
import { CallTimerPipe } from './call-timer.pipe';

@NgModule({
  imports: [
        CommonModule,
        MaterialModule
    ],
  declarations: [ VideoChatComponent, CallTimerPipe ],
  exports: [ VideoChatComponent ],
  providers: [ QBAppConfigService, QBService, QBusersService, CallTimerPipe ],
  entryComponents: [ VideoChatComponent ]
})
export class VideoChatModule { 

}