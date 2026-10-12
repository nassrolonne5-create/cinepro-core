import '@omss/framework';

declare module '@omss/framework' {
    interface Source {
        server?: string;
        size?: number;
    }
}
