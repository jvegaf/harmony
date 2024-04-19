import dayjs, { Dayjs } from 'dayjs';

export default class BeatportToken {
  private readonly accessToken: string;
  private readonly expiresDayjs: Dayjs;

  constructor(accessToken: string, expiresIn: string) {
    this.accessToken = accessToken;
    this.expiresDayjs = this.getExpiresDayjs(expiresIn);
  }

  private getExpiresDayjs(expires: string): Dayjs {
    return dayjs().add(Number(expires), 'second');
  }

  Value(): string {
    return this.accessToken;
  }

  IsValid(): boolean {
    return dayjs().isBefore(this.expiresDayjs);
  }
}
