import { LightningElement, api, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecord } from 'lightning/uiRecordApi';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';

export default class ConditionalRecordForm extends LightningElement {

    @api classes;
    @api columns;
    @api customFilterLogic;
    @api fields;
    @api filterLogic;
    @api filters;
    @api icon;
    @api mode = 'view';
    @api objectApiName;
    @api recordId;
    @api successMessage;
    @api title;
    allFields;
    requiredFields;
    recordData;
    meetsCriteria = false;
    objectData;

    @wire(getObjectInfo, { objectApiName: '$objectApiName' })
    objectInfo({ error, data }) {
        if (data) {
            let fields = [];
            for (let field in data.fields) {
                fields.push(this.objectApiName + '.' + field);
            }
            this.allFields = fields;
            this.objectData = data;
            this.requiredFields = [`${this.objectApiName}.Id`];
        }
    }

    @wire(getRecord, { recordId: '$recordId', fields: '$requiredFields', optionalFields: '$allFields' })
    wiredRecord({ error, data }) {
        if (data) {
            try {
                this.recordData = data.fields;

                let criteriaList = this.filters ? this.filters.split(';') : [];

                if (this.recordData && criteriaList) {
                    let criteriaResults = [];
                    for (let criteria of criteriaList) {
                        let rule = criteria.split(',');
                        let filterField = rule[0];
                        let filterOperator = rule[1];
                        let filterValue = rule[2];
                        if (filterField in this.recordData) {
                            criteriaResults.push(this.resolveFilter(this.recordData, filterField, filterOperator, filterValue));
                        } else {
                            this.showError('Error in \'Record Form - Conditional\' component - component visibility criteria field not found: ' + field);
                        }
                    }

                    let expToEvaluate;
                    if (this.customFilterLogic) {
                        let numberOfLogicItems = 0;
                        expToEvaluate = this.customFilterLogic.replace(/OR/g, '||').replace(/AND/g, '&&')
                            .replace(/(\d+)/g, function(match, number) {
                                let index = parseInt(number) - 1;
                                if (typeof criteriaResults[index] != 'undefined') {
                                    numberOfLogicItems++;
                                    return criteriaResults[index]
                                } else {
                                    return match;
                                }
                            });
                        if (criteriaResults.length !== numberOfLogicItems) {
                            throw new Error('Wrong number of logical expressions in \'Record Form - Conditional\' component')
                        }
                    } else {
                        expToEvaluate = criteriaResults.join(this.filterLogic === 'OR' ? '||' : '&&');
                    }

                    this.meetsCriteria = this.evaluate(expToEvaluate);
                }
            } catch(error) {
                this.showError(error.message)
                console.error(error);
            }
        }
        else if (error) {
            this.showError(error.message)
            console.error(error);
        }
    }

    resolveFilter(recordData, filterField, filterOperator, filterValue) {
        let comparisonResult;
        const fieldValue = recordData[filterField].value;
        if (filterOperator === '=') {
            comparisonResult = fieldValue === this.convertVarType(filterField, filterValue);
        } else if (filterOperator === '!=') {
            comparisonResult = fieldValue !== this.convertVarType(filterField, filterValue);
        } else if (filterOperator === '<') {
            comparisonResult = fieldValue < this.convertVarType(filterField, filterValue);
        } else if (filterOperator === '<=') {
            comparisonResult = fieldValue <= this.convertVarType(filterField, filterValue);
        } else if (filterOperator === '>') {
            comparisonResult = fieldValue > this.convertVarType(filterField, filterValue);
        } else if (filterOperator === '>=') {
            comparisonResult = fieldValue >= this.convertVarType(filterField, filterValue);
        }
        return comparisonResult;
    }

    getFieldType(filterField) {
        if (this.objectData) {
            return this.objectData.fields[filterField].dataType;
        }
    }

    convertVarType(filterField, filterValue) {
        const fieldType = this.getFieldType(filterField);
        let result;

        if (filterValue === 'null') {
            result = null;
        }
        else if (['Currency', 'Double', 'Int'].includes(fieldType) && this.isNumeric(filterValue)) {
            result = parseFloat(filterValue);
        }
        else if (fieldType === 'Boolean') {
            if (filterValue === 'true') {
                result = true;
            }
            else if (filterValue === 'false') {
                result = false;
            }
        }
        else if (fieldType === 'DateTime') {
            result = new Date(filterValue).toISOString();
        }
        else {
            result = filterValue;
        }
        return result;
    }

    isNumeric(filterValue) {
        return new RegExp(/^(?=.)([+-]?(\d*)(\.(\d+))?)$/).test(filterValue);
    }

    evaluate(exp) {
        return new Function('return ' + exp)();
    }

    showError(msg) {
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Record Form - Conditional error',
                message: msg,
                mode: 'sticky',
                variant: 'error'
            })
        );
    }

}