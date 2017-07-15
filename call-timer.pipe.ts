import { OnDestroy, ChangeDetectorRef, Pipe, PipeTransform } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/interval';
import 'rxjs/add/operator/repeatWhen';
import 'rxjs/add/operator/startWith';
import 'rxjs/add/operator/takeWhile';

@Pipe({
  name: 'callTimer',
  pure: false
})
export class CallTimerPipe implements PipeTransform, OnDestroy {
  private readonly async: AsyncPipe;

  private isDestroyed = false;
  private value: Date;
  private timer: Observable<string>;

  constructor(ref: ChangeDetectorRef) {
    this.async = new AsyncPipe(ref);
  }

  public transform(obj: any, ...args: any[]): any {
    if (obj == null) {
      return '';
    }

    if (!(obj instanceof Date)) {
      throw new Error('TimeAgoPipe works only with Dates');
    }

    this.value = obj;

    if (!this.timer) {
      this.timer = this.getObservable();
    }

    return this.async.transform(this.timer);
  }

  public now(): Date {
    return new Date();
  }

  public ngOnDestroy() {
    this.isDestroyed = true;
  }

  private getObservable() {
    return Observable
      .of(1)
      .repeatWhen(notifications => {
        return notifications.flatMap((x, i) => {
          const sleep = i < 60 ? 1000 : 30000;
          return Observable.timer(sleep);
        });
      })
      .takeWhile(_ => !this.isDestroyed)
      .map((x, i) => this.elapsed());
  };

  private elapsed(): string {
    let now = this.now().getTime();

    let diff = new Date(now - this.value.getTime());
    return diff.toISOString().substring(11, 23).substring(0,8);

  }
}