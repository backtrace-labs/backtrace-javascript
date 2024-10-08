import { render, screen } from '@testing-library/react';
import React from 'react';
import { BacktraceClient } from '../src/BacktraceClient.js';
import { ErrorBoundary } from '../src/ErrorBoundary.js';

describe('Error Boundary', () => {
    const childrenText = 'I am the children';
    const fallbackText = 'This is a fallback';
    const errorText = 'Rendering error!';

    function ValidComponent() {
        return <p>{childrenText}</p>;
    }

    function ErrorComponent() {
        throw new Error(errorText);
        return <p>{childrenText}</p>;
    }

    function Fallback() {
        return <p>{fallbackText}</p>;
    }

    const fallbackFunction = () => <Fallback />;

    let consoleErrorSpy: jest.SpyInstance;
    beforeEach(() => {
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => null);
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    describe('With BacktraeClient uninitialized', () => {
        it('Should throw an error when BacktraceClient is uninitialized and an ErrorBoundary is used', () => {
            expect(() =>
                render(<ErrorBoundary fallback={<Fallback />}>{<ErrorComponent />}</ErrorBoundary>),
            ).toThrowError();
        });
    });

    describe('With BacktraceClient initialized', () => {
        let client: BacktraceClient;
        beforeEach(() => {
            client = BacktraceClient.initialize({
                url: `https://submit.backtrace.io/universe/token/json`,
                name: 'test',
                version: '1.0.0',
            });
        });

        afterEach(() => {
            client = undefined as unknown as BacktraceClient;
            jest.restoreAllMocks();
        });

        it('Should not throw an error when BacktraceClient is initialized and an ErrorBoundary is used', () => {
            expect(() =>
                render(<ErrorBoundary fallback={Fallback}>{<ValidComponent />}</ErrorBoundary>),
            ).not.toThrowError();
        });

        it('Should render children', () => {
            render(<ErrorBoundary fallback={Fallback}>{<ValidComponent />}</ErrorBoundary>);
            expect(screen.getByText(childrenText));
        });

        it('Should render fallback function on rendering error', () => {
            render(<ErrorBoundary fallback={fallbackFunction}>{<ErrorComponent />}</ErrorBoundary>);
            expect(screen.getByText(fallbackText));
        });

        it('Should render fallback component on rendering error', () => {
            render(<ErrorBoundary fallback={<Fallback />}>{<ErrorComponent />}</ErrorBoundary>);
            expect(screen.getByText(fallbackText));
        });

        it('Should render nothing if no fallback is passed in and rendering error', () => {
            const { container } = render(
                <ErrorBoundary>
                    <ErrorComponent />
                </ErrorBoundary>,
            );
            expect(container.firstChild).toBeNull();
        });

        it('Should send to Backtrace on rendering error', () => {
            const clientSpy = jest.spyOn(client, 'send');
            render(<ErrorBoundary fallback={<Fallback />}>{<ErrorComponent />}</ErrorBoundary>);
            expect(clientSpy).toHaveBeenCalled();
        });

        it('Should not send to Backtrace when no rendering error occurs', () => {
            const clientSpy = jest.spyOn(client, 'send');
            render(<ErrorBoundary fallback={<Fallback />}>{<ValidComponent />}</ErrorBoundary>);
            expect(clientSpy).not.toHaveBeenCalled();
        });
    });
});
