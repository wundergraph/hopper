import * as React from 'react';
import 'monaco-graphql/esm/monaco.contribution';
import {HeadlessConfiguration} from "./lib/controller";
import {useController} from "./lib/controller/react-hooks";
import './lib/controller/hopper.css';
import './App.css';

/* eslint import/no-webpack-loader-syntax: off */

// @ts-ignore
import EditorWorker from 'worker-loader!monaco-editor/esm/vs/editor/editor.worker';
// @ts-ignore
import GraphQLWorker from 'worker-loader!monaco-graphql/esm/graphql.worker';
// @ts-ignore
import JSONWorker from 'worker-loader!monaco-editor/esm/vs/language/json/json.worker';

// @ts-ignore
window.MonacoEnvironment = {
    getWorker(_workerId: string, label: string) {
        if (label === 'graphqlDev') {
            return new GraphQLWorker();
        }
        if (label === 'json') {
            return new JSONWorker();
        }
        return new EditorWorker();
    },
};

const initialQuery = `

query Example {
  launchesPast {
    mission_name
    # format me using the right click context menu
        launch_date_local
    launch_site {
      site_name_long
    }
    links {
      article_link
      video_link
    }
  }
}

query Example2 {
  users {
    id
    name
  }
}

`

const config: HeadlessConfiguration = {
    schema: {
        SchemaURI: ''
    },
    editor: {
        initialQuery: initialQuery,
    }
};

interface AppProps {
    hideHeader?: boolean,
    hideUrlField?: boolean,
    initialSchemaURI?: string,
}

const defaultAppProps: AppProps = {
    hideHeader: false,
    hideUrlField: false,
    initialSchemaURI: "https://api.spacex.land/graphql/"
}

const App: React.FC<AppProps> = (props) => {
    config.schema.SchemaURI = props.initialSchemaURI;
    const {state, updateUpstream, operationsDiv, variablesDiv, resultsDiv} = useController(config);

    const handleURLChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateUpstream(e.target.value);
    }

    const hasActiveOperation = (): boolean => {
        return state.activeOperationIndex !== undefined  && state.activeOperationIndex > -1
    }

    const activeOperationName = (): string => {
        if (state.activeOperationIndex === undefined || state.activeOperationIndex < 0 || state.activeOperationIndex >= state.operations.length) {
            return "";
        }

        return state.operations[state.activeOperationIndex].name;
    }

    return (
        <div className="h-full w-full bg-gray-700 flex flex-col">
            { !props.hideHeader &&
                <div className="flex justify-between px-2">
                    <div className="m-2 text-white text-3xl">WunderGraph <span className="font-bold">Hopper</span></div>
                </div>
            }
            <div className="flex flex-grow items-stretch overflow-hidden">
                <div className="flex-1 flex flex-col m-2">
                    <div className="flex flex-col space-y-2 flex-grow p-1 bg-gray-800 rounded-lg overflow-hidden">
                        <div className="flex justify-between items-center mx-3 my-auto pt-1">
                            <div className="text-white text-sm font-semibold">Operations</div>
                            <div className="flex items-center justify-end w-2/3">
                                { !props.hideUrlField &&
                                    <input type="text" className="mr-4 px-2 py-1 bg-gray-900 text-gray-400 text-sm rounded-md flex-1" value={state.upstreamURL || config.schema.SchemaURI} onChange={handleURLChange} />
                                }
                                <button className={`flex items-center bg-green-800 ${hasActiveOperation() ? 'hover:bg-green-900' : ''} disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-md py-1 px-3`} disabled={!hasActiveOperation()}>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 mr-1">
                                        <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                                    </svg>
                                    <span className="font-semibold">Run</span>
                                </button>
                            </div>
                        </div>
                        <div ref={operationsDiv} className="h-full w-full rounded-lg overflow-hidden" />
                    </div>
                    <div className="h-1/5 mt-2 p-1 bg-gray-800 rounded-lg overflow-hidden">
                        <div className="flex justify-between items-center mx-3 my-auto pt-1 pb-2">
                            <div className="text-white text-sm font-semibold">Variables <span className="text-xs text-gray-400 ml-2">{activeOperationName()}</span></div>
                        </div>
                        <div ref={variablesDiv} className="h-full w-full rounded-lg overflow-hidden" />
                    </div>
                </div>
                <div className="flex-1 m-2 p-1 bg-gray-800 rounded-lg overflow-hidden">
                    <div className="flex justify-between items-center mx-3 my-auto pt-1 pb-2">
                        <div className="text-white text-sm font-semibold">Result</div>
                        <button className="flex items-center hover:bg-gray-900 text-gray-500 text-sm rounded-md py-1 px-3">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 mr-1">
                                <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
                                <path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                            </svg>
                            <span className="font-semibold">Copy</span>
                        </button>
                    </div>
                    <div ref={resultsDiv} className="h-full w-full rounded-lg overflow-hidden"></div>
                </div>
            </div>
        </div>
    );
}

App.defaultProps = defaultAppProps;
export default App;
