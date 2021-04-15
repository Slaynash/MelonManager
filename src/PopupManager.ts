import { Localization } from "./Localization";

export class PopupManager {
    private static overlayElement: HTMLElement;
    private static backgroundElement: HTMLElement;

    private static overlayShown: boolean = false;
    private static shownPopups: HTMLElement[] = [];

    public static init(): void {
        this.backgroundElement = document.getElementById("background-overlay");
        this.overlayElement = document.getElementById("loading-overlay");
    }

    public static showOverlay(text: string): void {
        this.backgroundElement.style.display = 'block';
        this.overlayElement.style.display = 'flex';

        this.overlayElement.innerHTML = text;
    }

    public static showErrorPopup(text: string, onClose: () => void = undefined, buttonName: string = 'Close') {
        let popup = this.showPopup(text, onClose, undefined, buttonName, null);
        (<HTMLElement>popup.firstChild).classList.add('popup-error')
        return popup;
    }

    public static showErrorPopupBlocking(text: string, onClose: (popup: HTMLElement) => void = undefined, buttonName: string = 'Close'): Promise<void> {
        return new Promise(onResolve => {
            let popup = this.showPopup(text, () => {
                onClose(popup);
                onResolve();
            }, undefined, buttonName, null);
            (<HTMLElement>popup.firstChild).classList.add('popup-error');
        });
    }

    public static showPopup(text: string, onAccept: () => void, onCancel: () => void = undefined,
        buttonYesName: string = Localization.getLocalizedText('continue'), buttonNoName: string = Localization.getLocalizedText('cancel')): HTMLElement {
        
        this.backgroundElement.style.display = 'block';
        
        let hasCancelButton = !!buttonNoName;

        let popupHTML = '';
        popupHTML += `<div id="confirmation-popup">`;
        popupHTML +=    `<div class="confirmation-popup-box">`;
        popupHTML +=        `<div id="confirmation-popup-content">${text}</div>`;
        popupHTML +=        `<div class="confirmation-popup-buttons ${window.navigator.platform.indexOf('Win') ? 'inverted' : ''}">`;
        popupHTML +=            `${hasCancelButton ? `<button class="confirmation-button button-cancel">${buttonNoName}</button>` : ''}`;
        popupHTML +=            `<button class="confirmation-button button-continue">${buttonYesName}</button>`;
        popupHTML +=        `</div>`;
        popupHTML +=    `</div>`;
        popupHTML += `</div>`;

        let template = document.createElement('div');
        template.innerHTML = popupHTML.trim();
        let popupContainer = <HTMLElement>template.firstChild.cloneNode(true);
        this.backgroundElement.appendChild(popupContainer);

        let noButton = hasCancelButton ? <HTMLElement>popupContainer.firstChild.childNodes[1].childNodes[0] : undefined;
        let yesButton = <HTMLElement>popupContainer.firstChild.childNodes[1].childNodes[hasCancelButton ? 1 : 0];


        yesButton.addEventListener('click', event => {
            if (!onAccept) this.hidePopup(popupContainer);
            else onAccept();
        });

        if (hasCancelButton) {
            noButton.addEventListener('click', event => {
                if (!onCancel) this.hidePopup(popupContainer);
                else onCancel();
            });
        }

        this.shownPopups.push(popupContainer);

        return popupContainer;
    }

    public static hideOverlay(): void {
        this.overlayShown = false;
        this.overlayElement.style.display = 'none';

        if (this.shownPopups.length === 0)
            this.hideBackground();
    }

    public static hidePopup(popup: HTMLElement): void {
        this.shownPopups.splice(this.shownPopups.indexOf(popup), 1);
        popup.remove();
        if (this.shownPopups.length === 0 && !this.overlayShown)
            this.hideBackground();
    }


    private static hideBackground(): void {
        this.backgroundElement.style.display = 'none';
    }
}