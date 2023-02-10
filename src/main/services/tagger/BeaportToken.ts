import type { Moment } from 'moment';
import moment from 'moment';

export default class BeatportToken{
  private readonly accessToken: string;

  private readonly expiresMoment: Moment;

  constructor(accessToken: string, expiresIn: string){
    this.accessToken   = accessToken;
    this.expiresMoment = this.getExpiresMoment(expiresIn);
  }

  // eslint-disable-next-line class-methods-use-this
  private getExpiresMoment(expires: string): Moment{
    return moment()
      .add(Number(expires), 'seconds');
  }

  Value(): string{
    return this.accessToken;
  }

  IsValid(): boolean{
    return moment()
      .isBefore(this.expiresMoment);
  }
}
