export declare class TimeControlDto {
    type: string;
    initialTime: number;
    increment: number;
}
export declare class JoinQueueDto {
    timeControl: TimeControlDto;
    guestName?: string;
}
