import { Injectable } from '@angular/core';
import { Observable } from 'rxjs'; 
import * as _ from 'underscore';

import { IQBUser } from './interfaces';
declare var QB: any;

@Injectable()
export class QBusersService{
    private service: any;

    constructor(){
        this.service = QB;
    }

    getUsers(ids: Array<number>): Observable<[IQBUser]>{
        let params = {filter: { field: 'id', param: 'in', value: ids }};

        return Observable.create(observer => {
            this.service.users.listUsers(params, (err, data) => {
                let users = [];

                _.each(data['items'], (user) => {
                    users.push(user.user);
                });

                observer.next(users);
                observer.complete();
            })
        });
    }


}