import {ASTNode, GraphQLSchema, TypeNode, visit} from "graphql";
import {JSONSchema7 as JSONSchema} from "json-schema";

export const VariablesJSONSchema = (graphQLSchema: GraphQLSchema, operationDocument: ASTNode, operationName: string): JSONSchema => {

    let schema: JSONSchema = {
        type: "object",
        properties: {},
        additionalProperties: false,
    }

    visit(operationDocument, {
        OperationDefinition: {
            enter: node => {
                if (node.name?.value != operationName) {
                    return false
                }
            }
        },
        VariableDefinition: {
            enter: node => {
                let type = node.type;
                if (type.kind === "NonNullType" && node.defaultValue !== undefined) {
                    type = type.type;
                }
                const name = node.variable.name.value;
                schema.properties![name] = typeSchema(schema, graphQLSchema, type, name);
            }
        }
    });

    return schema
}

const typeSchema = (parent: JSONSchema, graphQLSchema: GraphQLSchema, type: TypeNode, name: string): JSONSchema => {
    switch (type.kind) {
        case "NonNullType":
            switch (parent.type) {
                case "object":
                    parent.required = [...parent.required || [], name]
                    break;
                case "array":
                    parent.minItems = 1;
                    break;
            }
            return typeSchema(parent, graphQLSchema, type.type, name)
        case "ListType":
            const schema: JSONSchema = {
                type: "array",
                additionalProperties: false,
            }
            schema.items = typeSchema(schema, graphQLSchema, type.type, name)
            return schema;
        case "NamedType":
            switch (type.name.value) {
                case 'Int':
                    return {
                        type: "integer"
                    }
                case 'Boolean':
                    return {
                        type: "boolean"
                    }
                case 'ID':
                    return {
                        type: "string"
                    }
                case 'Float':
                    return {
                        type: "number"
                    }
                case 'String':
                    return {
                        type: "string"
                    }
                default:
                    let schema: JSONSchema = {
                        additionalProperties: false,
                    }
                    const namedType = graphQLSchema.getType(type.name.value);
                    if (namedType === null || namedType === undefined || !namedType.astNode) {
                        return {}
                    }
                    switch (namedType.astNode.kind) {
                        case "EnumTypeDefinition":
                            schema.type = "string";
                            schema.enum = namedType.astNode.values?.map(e => {
                                return e.name.value
                            })
                            break;
                        case "InputObjectTypeDefinition":
                            schema.type = "object"
                            schema.properties = {};
                            namedType.astNode.fields?.forEach(f => {
                                const name = f.name.value;
                                let fieldType = f.type;
                                if (f.defaultValue !== undefined && fieldType.kind === "NonNullType") {
                                    fieldType = fieldType.type;
                                }
                                schema.properties![name] = typeSchema(schema, graphQLSchema, fieldType, name)
                            })
                            break;
                    }
                    return schema;
            }
    }
    return {}
}