import { LightningElement, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class RecordForm extends LightningElement {

    @api classes;
    @api columns;
    @api fields;
    @api formula;
    @api icon;
    @api mode = 'view';
    @api objectApiName;
    @api recordId;
    @api successMessage;
    @api title;

    get fieldsList() {
        return this.fields ? this.fields.replace(/\s/g, '').split(',') : [];
    }

    get isTitleEmpty() {
        return !this.title;
    }

    get isIconEmpty() {
        return !this.icon;
    }

    get isTitleAndIconEmpty() {
        return !this.title && !this.icon;
    }

    handleSuccess() {
        if (this.successMessage) {
            const showToastEvt = new ShowToastEvent({
                title : this.successMessage,
                variant : 'success'
            });
            this.dispatchEvent(showToastEvt);
        }
    }
}