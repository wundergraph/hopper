import {api as GraphQLAPI} from "monaco-graphql";
import {Options} from "prettier";
import * as monaco from "monaco-editor";
import {
    visit,
    print,
    DocumentNode,
    VariableNode,
    OperationDefinitionNode,
    buildClientSchema,
    IntrospectionQuery,
    printSchema,
    parse,
    TypeInfo,
    buildSchema,
    GraphQLSchema,
    visitWithTypeInfo,
    parseType,
    TypeNode,
    Location,
} from "graphql";
import {VariablesJSONSchema} from "../json-schema";
import {JSONSchema7 as JSONSchema} from "json-schema";
import { debounce } from "../utils/debounce";

const defaultValues = {
    style: {
        theme: 'vs-dark',
    },
    language: {
        GraphQL: 'graphqlDev'
    }
}

export interface HeadlessConfiguration {
    prettierConfig?: Options,
    editor?: EditorConfig,
    language?: LanguageConfig,
    style?: StyleConfig
    schema: SchemaConfig
}

export interface Configuration extends HeadlessConfiguration {
    div: DivConfiguration
}

export interface EditorConfig {
    initialQuery?: string
}

export interface SchemaConfig {
    SchemaURI?: string,
    SchemaString?: string
}

export interface DivConfiguration {
    operations: HTMLDivElement
    variables: HTMLDivElement
    results: HTMLDivElement
}

export interface StyleConfig {
    theme?: string
}

export interface LanguageConfig {
    GraphQL?: string
}

export const initialState: State = {
    loading: false,
    operations: [],
    activeOperationIndex: -1,
    operationsPosition: {
        lineNumber: 0,
        column: 0,
    },
    upstreamURL: ""
}

export interface Position {
    /**
     * line number (starts at 1)
     */
    readonly lineNumber: number;
    /**
     * column (the first character in a line is between column 1 and column 2)
     */
    readonly column: number;
}

export interface State {
    loading: boolean,
    operations: Operation[]
    operationsDocument?: DocumentNode
    activeOperationIndex?: number
    operationsPosition: Position
    upstreamURL: string,
    schema?: {
        raw: string
        doc: DocumentNode,
        graphQLSchema: GraphQLSchema
    }
}

export interface Operation {
    name: string
    content: string
    startLine: number
    endLine: number
    endColumn: number
    isActive: boolean,
    variablesJSONSchema: JSONSchema
    variableValue: string
}

interface ParsedOperation {
    document?: DocumentNode,
    operations: Operation[]
}

export class Controller {
    constructor(config: Configuration, nextState: (state: State) => void) {
        this.config = config
        this.nextState = nextState;
        this.currentState = initialState;
        this.configurePrettier();
        this.operationsModel = this.configureOperationsModel();
        this.operationsEditor = this.configureOperationsEditor(this.operationsModel);
        this.variablesModel = this.configureVariablesModel();
        this.variablesEditor = this.configureVariablesEditor(this.variablesModel);
        this.resultsModel = this.configureResultsModel();
        this.resultsEditor = this.configureResultsEditor(this.resultsModel);
        this.configureActionFetch();
        this.configureActionExtractVariable();
        this.configureSwitchEditors();
        this.configureSwitchOperations();

        (async () => this.configureSchema())();
        this.debouncedConfigureSchema = debounce(() => {
            (async () => this.configureSchema())();
        }, 1000);
    }

    private readonly config: Configuration;
    private readonly nextState: (state: State) => void;
    private currentState: State;
    private readonly operationsModel: monaco.editor.ITextModel;
    private readonly operationsEditor: monaco.editor.IStandaloneCodeEditor;
    private readonly variablesModel: monaco.editor.ITextModel;
    private readonly variablesEditor: monaco.editor.IStandaloneCodeEditor;
    private readonly resultsModel: monaco.editor.ITextModel;
    private readonly resultsEditor: monaco.editor.IStandaloneCodeEditor;

    private debouncedConfigureSchema: () => void;
    private setState = (update: (previous: State) => State) => {
        this.currentState = update(this.currentState);
        this.nextState(this.currentState);
    }
    private operationsVersionId: undefined | number;
    public run = async () => {
        const that = this;
        this.operationsEditor.onDidChangeCursorPosition(async e => {
            const currentVersion = that.operationsModel.getVersionId();
            let operations: Operation[] = that.currentState.operations;
            let document: undefined | DocumentNode;
            if (currentVersion !== that.operationsVersionId) {
                const parsed = await that.parseOperations();
                that.operationsVersionId = currentVersion;
                if (parsed?.operations === undefined) {
                    return
                }
                operations = parsed.operations
                document = parsed.document
            }
            that.setState(prev => ({
                ...prev,
                operationsPosition: e.position,
                operationsDocument: document || prev.operationsDocument,
                ...that.calculateActiveOperation(operations, e.position.lineNumber)
            }));

            that.applyOperationsDecorations();
            that.syncVariablesEditor();
        });

        this.variablesEditor.onDidChangeModelContent(e => {
            const value = this.variablesEditor.getModel()?.getValue();
            const i = that.currentState.activeOperationIndex;
            if (i === undefined || value === undefined) {
                return
            }
            if (that.currentState.operations[i].variableValue === value) {
                return;
            }
            that.currentState.operations[i].variableValue = value
            console.log('saved model', that.currentState.operations[i]);
        })

        const parsed = await this.parseOperations();
        if (parsed?.operations === undefined) {
            return
        }
        this.setState(prev => ({
            ...prev,
            operationsDocument: parsed.document,
            ...this.calculateActiveOperation(parsed.operations, prev.operationsPosition.lineNumber)
        }));
        this.applyOperationsDecorations();
    }
    public cleanup = () => {
        this.operationsModel.dispose();
        this.operationsEditor.dispose();
        this.variablesModel.dispose();
        this.variablesEditor.dispose();
        this.resultsModel.dispose();
        this.resultsEditor.dispose();
    }
    private configureOperationsModel = () => {
        return monaco.editor.createModel(this.config.editor?.initialQuery || "",
            this.config.language?.GraphQL || defaultValues.language.GraphQL,
        );
    }
    private configureOperationsEditor = (model: monaco.editor.ITextModel) => {
        return monaco.editor.create(this.config.div.operations,
            {
                model: model,
                automaticLayout: true,
                formatOnPaste: true,
                formatOnType: true,
                folding: true,
                lineNumbers: "on",
                minimap: {
                    enabled: false
                },
                theme: this.config.style?.theme || defaultValues.style.theme,
            },
        );
    }
    private configureVariablesModel = () => {
        return monaco.editor.createModel(
            `{}`,
            'json',
            monaco.Uri.file('/1/variables.json'),
        );
    }
    private configureVariablesEditor = (model: monaco.editor.ITextModel) => {
        return monaco.editor.create(
            this.config.div.variables,
            {
                model: model,
                automaticLayout: true,
                theme: defaultValues.style.theme,
                minimap: {
                    enabled: false
                }
            },
        );
    }
    private configureResultsModel = () => {
        return monaco.editor.createModel(
            `{}`,
            'json',
            monaco.Uri.file('/1/results.json'),
        );
    }
    private configureResultsEditor = (model: monaco.editor.ITextModel) => {
        return monaco.editor.create(
            this.config.div.results,
            {
                model: model,
                automaticLayout: true,
                readOnly: true,
                theme: defaultValues.style.theme,
                minimap: {
                    enabled: false
                }
            },
        );
    }
    private configureSchema = async () => {
        try {
            if (this.config.schema.SchemaURI) {
                GraphQLAPI.setSchemaUri(this.config.schema.SchemaURI);
                const introspectionQuery = await GraphQLAPI.getSchema() as IntrospectionQuery;
                const schema = buildClientSchema(introspectionQuery);
                const printed = printSchema(schema);
                this.prepareSchema(printed);
            } else if (this.config.schema.SchemaString) {
                await GraphQLAPI.setSchema(this.config.schema.SchemaString)
                this.prepareSchema(this.config.schema.SchemaString)
            }
        } catch (e) {
            console.log(e);
        }
    }

    public updateUpstream = (upstream: string) => {
        if (this.config.schema.SchemaURI === upstream) {
            return
        }

        this.config.schema.SchemaURI = upstream;
        this.setState(prev => ({
            ...prev,
            upstreamURL: upstream
        }))
        this.debouncedConfigureSchema();
    }

    private prepareSchema = (input: string) => {
        const doc = parse(input);
        const graphQLSchema = buildSchema(input);
        this.setState(previous => ({
            ...previous,
            schema: {
                upstream: this.config.schema.SchemaURI || "",
                doc,
                raw: input,
                graphQLSchema
            }
        }));
    }
    private configurePrettier = () => {
        GraphQLAPI.setFormattingOptions({
            prettierConfig: this.config.prettierConfig || {
                printWidth: 120,
            },
        });
    }
    private configureActionFetch = () => {
        const action: monaco.editor.IActionDescriptor = {
            id: 'graphql-run',
            label: 'Run Operation',
            contextMenuOrder: 0,
            contextMenuGroupId: 'operation',
            keybindings: [
                // eslint-disable-next-line no-bitwise
                monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
            ],
            run: this.executeCurrentOperation,
        };
        this.operationsEditor.addAction(action);
        this.variablesEditor.addAction(action);
    }
    private handleSwitchEditors = () => {
        if (this.operationsEditor.hasTextFocus()) {
            this.variablesEditor.focus();
        } else {
            this.operationsEditor.focus();
        }
    }
    private configureSwitchEditors = () => {
        this.operationsEditor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.Tab, this.handleSwitchEditors)
        this.variablesEditor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.Tab, this.handleSwitchEditors)
    }
    private jumpToOperation = (index: number) => {
        if (this.currentState.operations.length - 1 < index) {
            return
        }
        const line = this.currentState.operations[index].startLine;
        this.operationsEditor.setPosition(new monaco.Position(line, 0))
    }
    private handleOperationUp = () => {
        if (this.currentState.activeOperationIndex === undefined) {
            return
        }
        if (this.currentState.operations.length -1 >= this.currentState.activeOperationIndex + 1) {
            this.jumpToOperation(this.currentState.activeOperationIndex + 1)
        } else {
            this.jumpToOperation(0)
        }
    }
    private handleOperationDown = () => {
        if (this.currentState.activeOperationIndex === undefined) {
            return
        }
        if (this.currentState.activeOperationIndex - 1 != -1) {
            this.jumpToOperation(this.currentState.activeOperationIndex - 1)
        } else {
            this.jumpToOperation(this.currentState.operations.length - 1)
        }
    }
    private configureSwitchOperations = () => {
        this.operationsEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.UpArrow, this.handleOperationUp)
        this.operationsEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.DownArrow, this.handleOperationDown)
    }
    private configureActionExtractVariable = () => {
        const action: monaco.editor.IActionDescriptor = {
            id: 'extract-variable',
            label: 'Extract Variable',
            contextMenuOrder: 1,
            contextMenuGroupId: 'operation',
            keybindings: [
                // eslint-disable-next-line no-bitwise
                monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_X,
            ],
            run: this.extractVariable,
        };
        this.operationsEditor.addAction(action)
    }
    private extractVariable = async () => {
        const position = this.operationsEditor.getPosition();
        console.log("extractVariable", position, this.currentState);
        if (this.currentState.operationsDocument === undefined || this.currentState.activeOperationIndex === undefined) {
            return
        }
        const activeOperation = this.currentState.operations[this.currentState.activeOperationIndex];
        const info = new TypeInfo(this.currentState.schema!.graphQLSchema);
        let inputType: TypeNode;
        let variableName: string;
        let didUpdate = false;
        let oldOperation: Location | undefined;
        let variableLocation: Location | undefined;
        const updated = visit(this.currentState.operationsDocument, visitWithTypeInfo(info, {
            enter: node => {
                info.enter(node);
            },
            leave: node => {
                info.leave(node);
            },
            OperationDefinition: {
                enter: node => {
                    if (node.name?.value !== activeOperation.name) {
                        return false
                    }
                    oldOperation = node.loc
                },
                leave: node => {
                    if (node.variableDefinitions?.find(v => v.variable.name.value === variableName)?.variable !== undefined) {
                        return
                    }
                    console.log("leave", variableName, inputType)
                    const out: OperationDefinitionNode = {
                        ...node,
                        variableDefinitions: [
                            ...node.variableDefinitions || [],
                            {
                                variable: {
                                    kind: "Variable",
                                    name: {
                                        kind: "Name",
                                        value: variableName,
                                    }
                                },
                                kind: "VariableDefinition",
                                type: inputType,
                            }
                        ]
                    }
                    didUpdate = true;
                    return out;
                }
            },
            Argument: {
                enter: node => {
                    console.log("arg2", print(node), node.loc, position);
                    if (position?.lineNumber !== node.loc?.startToken.line) {
                        return
                    }
                    console.log("MATCH", node.value);
                    if (node.value.kind === "Variable") {
                        const variable = node.value as VariableNode;
                        variableName = variable.name.value;
                        inputType = parseType(info.getInputType()?.toString()!);
                        variableLocation = variable.loc;
                    }
                }
            }
        }));
        if (!didUpdate) {
            return;
        }
        const nextContent = print(updated);
        console.log("updated", nextContent);
        const nextParsed = parse(nextContent);
        let replacement = "";
        visit(nextParsed, {
            OperationDefinition: {
                enter: node => {
                    if (node.name?.value !== activeOperation.name) {
                        return false
                    }
                    replacement = print(node);

                },
            },
            VariableDefinition: {
                enter: node => {

                }
            }
        });
        if (replacement === "") {
            return
        }
        this.operationsModel.applyEdits([{
            forceMoveMarkers: true,
            range: new monaco.Range(
                oldOperation?.startToken.line!,
                oldOperation?.startToken.column!,
                oldOperation?.endToken.line!,
                oldOperation?.endToken.column! + 1,
            ),
            text: replacement!,
        }]);
        const nextPosition = {
            lineNumber: variableLocation!.endToken.line,
            column: variableLocation!.endToken.column + variableName!.length
        };
        this.operationsEditor.setPosition(nextPosition);
    }
    private syncVariablesEditor = () => {
        const i = this.currentState.activeOperationIndex;
        if (i === undefined) {
            return
        }
        const schema = this.currentState.operations[i].variablesJSONSchema;
        monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
            validate: true,
            schemas: [
                {
                    uri: '/1/variables.schema.json',
                    fileMatch: [this.variablesModel.uri.toString()],
                    schema,
                }
            ]
        });
        if (this.variablesModel.getValue() === this.currentState.operations[i].variableValue) {
            return;
        }
        this.variablesModel.applyEdits([{
            range: this.variablesModel.getFullModelRange(),
            forceMoveMarkers: true,
            text: this.currentState.operations[i].variableValue,
        }]);
    }
    private executeCurrentOperation = async () => {
        if (this.currentState.activeOperationIndex === undefined) {
            return
        }
        const operation = this.currentState.operations[this.currentState.activeOperationIndex];
        this.setState(prev => ({...prev, loading: true}));
        this.applyResultsDecorations(true);
        try {
            const variables = this.variablesEditor.getValue();
            const body: { variables?: string; query: string, operationName: string } = {
                query: operation.content,
                operationName: operation.name,
            };
            const parsedVariables = JSON.parse(variables);
            if (parsedVariables && Object.keys(parsedVariables).length) {
                body.variables = variables;
            }
            const result = await fetch(GraphQLAPI.schemaConfig.uri || "", {
                method: 'POST',
                headers: {'content-type': 'application/json'},
                body: JSON.stringify(body),
            });
            const resultText = await result.text();
            this.resultsEditor.setValue(JSON.stringify(JSON.parse(resultText), null, 2));
        } catch (err) {
            this.resultsEditor.setValue(err.toString());
        }
        this.setState(prev => ({...prev, loading: false}));
        this.applyResultsDecorations(false);
    }
    private parseOperations = async (): Promise<ParsedOperation | undefined> => {
        const operations: Operation[] = [];
        let document: undefined | DocumentNode;
        const value = this.operationsEditor.getModel()?.getValue();
        if (value === undefined) {
            return
        }
        const that = this;
        try {
            document = await GraphQLAPI.parse(value);
            let start = 0;
            let name = "";
            let variableValue = "";
            visit(document, {
                VariableDefinition: {
                    enter: node => {
                        console.log("variable", print(node));
                    },
                },
                OperationDefinition: {
                    enter: node => {
                        start = node.loc?.startToken.line || 0;
                        name = node.name?.value || "";
                        variableValue = that.currentState.operations.find(o => o.name === name)?.variableValue || "{}"
                    },
                    leave: node => {
                        const endLine = node.loc?.endToken.line || 0
                        const endColumn = node.loc?.endToken.column || 0;
                        operations.push({
                            name: name,
                            startLine: start,
                            endLine: endLine,
                            endColumn: endColumn,
                            content: print(node),
                            isActive: false,
                            variablesJSONSchema: VariablesJSONSchema(this.currentState.schema?.graphQLSchema!, document!, name),
                            variableValue: variableValue,
                        });
                    }
                }
            });
        } catch (e) {
            console.log(e);
            return
        }
        console.log("parsed", document, operations);
        return {
            document,
            operations,
        };
    }

    private calculateActiveOperation = (operations: Operation[], activeLine: number) => {
        let activeOperationIndex;
        const mapped = operations.map((op, i) => {
            const isActive = activeLine >= op.startLine && activeLine <= op.endLine;
            if (isActive) {
                activeOperationIndex = i;
            }
            return {
                ...op,
                isActive
            }
        })
        return {
            operations: mapped,
            activeOperationIndex
        }
    }
    private operationsDecorations: string[] = [];
    private applyOperationsDecorations = () => {
        const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];
        if (this.currentState.activeOperationIndex === undefined) {
            newDecorations.push({
                range: this.operationsModel.getFullModelRange(),
                options: {isWholeLine: true, inlineClassName: 'inactiveOperation'}
            });
        } else {
            this.currentState.operations.forEach((op, i) => {
                if (!op.isActive) {
                    newDecorations.push({
                        range: new monaco.Range(op.startLine, 1, op.endLine, op.endColumn),
                        options: {isWholeLine: true, inlineClassName: 'inactiveOperation'}
                    })
                }
            });
        }
        this.operationsDecorations = this.operationsEditor.deltaDecorations(this.operationsDecorations, newDecorations);
    }
    private resultsDecorations: string[] = [];
    private applyResultsDecorations = (loading: boolean) => {
        const range = this.resultsModel.getFullModelRange();
        const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];
        if (loading) {
            newDecorations.push({
                range: range,
                options: {isWholeLine: true, inlineClassName: 'inactiveOperation'}
            });
        }
        this.resultsDecorations = this.resultsEditor.deltaDecorations(this.resultsDecorations, newDecorations);
    }
}