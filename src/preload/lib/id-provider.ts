import { v4 as uuidv4 } from 'uuid';

const makeID = (): string => uuidv4().replace(/-/g, '').toUpperCase().slice(-16);

export default makeID;
