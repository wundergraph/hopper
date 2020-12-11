import {Controller, HeadlessConfiguration, initialState, State} from "./index";
import {useCallback, useEffect, useRef, useState} from "react";

export const useController = (config: HeadlessConfiguration) => {
    const operationsDiv = useRef<null | HTMLDivElement>(null);
    const variablesDiv = useRef<null | HTMLDivElement>(null);
    const resultsDiv = useRef<null | HTMLDivElement>(null);
    const [state, setState] = useState<State>(initialState);
    const [controller, setController] = useState<Controller | undefined>();

    useEffect(() => {
        if (operationsDiv.current === null || variablesDiv.current === null || resultsDiv.current === null) {
            return;
        }
        const controller = new Controller({
            ...config,
            div: {
                operations: operationsDiv.current,
                variables: variablesDiv.current,
                results: resultsDiv.current,
            }
        }, (state) => {
            setState(state);
        });

        setController(controller);

        (async () => controller.run())();
        return () => {
            controller.cleanup();
        }
    }, [operationsDiv, variablesDiv, resultsDiv, config]);

    const updateUpstream = useCallback((newUpstreamURL: string) => {
        controller?.updateUpstream(newUpstreamURL);
    }, [controller])

    const runActiveOperation = useCallback(() => {
        if (controller === undefined){
            return
        }
        (async () => await controller.runCurrentOperation())();
    },[controller]);

    return {
        state,
        updateUpstream,
        operationsDiv,
        variablesDiv,
        resultsDiv,
        runActiveOperation
    }
}
