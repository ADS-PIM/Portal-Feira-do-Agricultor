import { MessageCreateDTO } from "../dto/message.dto";

export enum MessageSubject {
    DOUBT = "DOUBT",
    SUGGESTION = "SUGGESTION",
    COMPLAINT = "COMPLAINT",
    PARTNERSHIP = "PARTNERSHIP",
    OTHER = "OTHER"
}

export type propsMessage = {
    id: string;
    name: string;
    email: string;
    phone: string;
    subject: MessageSubject;
    message: string;
    submitDate: Date;// Date já pega o dia e o horario
}

export class Message {
    constructor(private props: propsMessage) {}

    public static construct({name, email, phone, subject, message}: MessageCreateDTO) {
        const props: propsMessage = {
            id: crypto.randomUUID(),
            name,
            email,
            phone: phone ? phone : '',
            subject: subject as MessageSubject,
            message,
            submitDate: new Date(),
        }
        return new Message(props);
    }

    public static reconstruct(props: propsMessage) {
        return new Message(props);
    }

    public get id () {
        return this.props.id;
    }

    public get name () {
        return this.props.name;
    }

    public get email () {
        return this.props.email;
    }

    public get phone () {
        return this.props.phone;
    }

    public get subject () {
        return this.props.subject;
    }

    public get message () {
        return this.props.message;
    }

    public get submitDate () {
        return this.props.submitDate;
    }
}