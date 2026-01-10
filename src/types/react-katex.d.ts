declare module 'react-katex' {
    import { FC, ReactNode } from 'react';

    interface KatexProps {
        children?: string;
        math?: string;
        errorColor?: string;
        renderError?: (error: Error) => ReactNode;
    }

    export const BlockMath: FC<KatexProps>;
    export const InlineMath: FC<KatexProps>;
}
