import {VariablesJSONSchema} from "./index";
import {buildSchema, parse} from "graphql";
import {JSONSchema7 as JSONSchema} from "json-schema";
import {assert} from 'chai';

const schema = `
type Query {
    foo: String
}
input Bar {
    nonNullString: String!
    nullableBool: Boolean
    nested: [[String!]!]
}
enum Baz {
    bat
    bal
}
`

const run = (operationDocument: string, expected: JSONSchema) => {
    const graphQLSchema = buildSchema(schema);
    const parsedOperationDocument = parse(operationDocument);
    const out = VariablesJSONSchema(graphQLSchema, parsedOperationDocument, 'Q');
    assert.equal(pretty(out), pretty(expected))
}

const pretty = (input: any): string => {
    return '\n' + JSON.stringify(input, null, "  ")
}

test("nullable int", () => {
    run(`query Q($arg: Int){__typename}`,
        {
            type: "object",
            properties: {
                arg: {
                    type: "integer"
                }
            },
            additionalProperties: false,
        },
    )
})

test("non null int with default", () => {
    run(`query Q($arg: Int = 1){__typename}`,
        {
            type: "object",
            properties: {
                arg: {
                    type: "integer"
                }
            },
            additionalProperties: false,
        },
    )
})

test("multiple args", () => {
    run(`query Q($arg1: Int $arg2: Boolean!){__typename}`,
        {
            type: "object",
            properties: {
                arg1: {
                    type: "integer"
                },
                arg2: {
                    type: "boolean"
                }
            },
            additionalProperties: false,
            required: ['arg2'],
        },
    )
})

test("nullable bool", () => {
    run(`query Q($arg: Boolean){__typename}`,
        {
            type: "object",
            properties: {
                arg: {
                    type: "boolean"
                }
            },
            additionalProperties: false,
        },
    )
})

test("nullable float", () => {
    run(`query Q($arg: Float){__typename}`,
        {
            type: "object",
            properties: {
                arg: {
                    type: "number"
                }
            },
            additionalProperties: false,
        },
    )
})

test("nullable String", () => {
    run(`query Q($arg: String){__typename}`,
        {
            type: "object",
            properties: {
                arg: {
                    type: "string"
                }
            },
            additionalProperties: false,
        },
    )
})

test("nullable ID", () => {
    run(`query Q($arg: ID){__typename}`,
        {
            type: "object",
            properties: {
                arg: {
                    type: "string"
                }
            },
            additionalProperties: false,
        },
    )
})

test("non null int", () => {
    run(`query Q($arg: Int!){__typename}`,
        {
            type: "object",
            properties: {
                arg: {
                    type: "integer"
                }
            },
            additionalProperties: false,
            required: ['arg'],
        },
    )
})

test("list of non null int", () => {
    run(`query Q($arg: [Int!]){__typename}`,
        {
            type: "object",
            properties: {
                arg: {
                    type: "array",
                    additionalProperties: false,
                    minItems: 1,
                    items: {
                        type: "integer"
                    },
                }
            },
            additionalProperties: false,
        },
    )
})

test("non null list of non null int", () => {
    run(`query Q($arg: [Int!]!){__typename}`,
        {
            type: "object",
            properties: {
                arg: {
                    type: "array",
                    additionalProperties: false,
                    minItems: 1,
                    items: {
                        type: "integer"
                    }
                }
            },
            additionalProperties: false,
            required: ['arg'],
        },
    )
})

test("nullable input object", () => {
    run(`query Q($arg: Bar){__typename}`,
        {
            type: "object",
            properties: {
                arg: {
                    additionalProperties: false,
                    type: "object",
                    properties: {
                        nonNullString: {
                            type: "string"
                        },
                        nullableBool: {
                            type: "boolean"
                        },
                        nested: {
                            type: "array",
                            additionalProperties: false,
                            minItems: 1,
                            items: {
                                type: "array",
                                additionalProperties: false,
                                minItems: 1,
                                items: {
                                    type: "string"
                                }
                            }
                        }
                    },
                    required: ['nonNullString']
                }
            },
            additionalProperties: false,
        },
    )
})

test("enum input", () => {
    run(`query Q($arg: Baz){__typename}`,
        {
            type: "object",
            properties: {
                arg: {
                    additionalProperties: false,
                    type: "string",
                    enum: ['bat','bal']
                }
            },
            additionalProperties: false,
        },
    )
})