import { useEffect } from 'react';
import { toast } from 'react-toastify';

export default function InnerFallback() {
    useEffect(() => {
        toast('Inner ErrorBoundary Triggered! Check your Backtrace console to see the Error and Component stacks.');
    });
    return null;
}
