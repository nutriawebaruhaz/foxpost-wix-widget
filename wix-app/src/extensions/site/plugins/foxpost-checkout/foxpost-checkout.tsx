import { currentCartV2 } from '@wix/ecom';

type SlotBrand = {
  backgroundColor?: string;
  textColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  selectionColor?: string;
  cornerRadius?: number;
};

type FoxpostPoint = {
  place_id?: number | string;
  operator_id?: string;
  name?: string;
  address?: string;
  zip?: string;
  city?: string;
  street?: string;
  findme?: string;
  geolat?: number;
  geolng?: number;
  country?: string;
  variant?: string;
  serviceString?: string;
  paymentOptionsString?: string;
};

const FOXPOST_OPTION_ID = 'foxpost_pickup';
const FOXPOST_CARRIER_APP_ID = '48809dd6-3504-4e8d-9021-c2b4003571a9';
const FOXPOST_ORIGIN = 'https://cdn.foxpost.hu';
const FOXPOST_PICKER_URL = 'https://cdn.foxpost.hu/apt-finder/v1/app/?lang=hu';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function splitStreet(street: string): { name: string; number?: string } {
  const clean = street.trim();
  const match = clean.match(/^(.*?)[,\s]+(\d+[A-Za-z]?\.?(?:\s*[-/]\s*\d+[A-Za-z]?\.?)?)$/);

  if (!match) {
    return { name: clean };
  }

  return {
    name: match[1].trim(),
    number: match[2].trim(),
  };
}

class NutriAFoxpostCheckout extends HTMLElement {
  private refreshCheckoutCallback: (() => Promise<void>) | null = null;
  private continueButtonCallback: ((isDisabled: boolean) => void) | null = null;
  private selectedPoint: FoxpostPoint | null = null;
  private pickerOpen = false;
  private saving = false;
  private errorMessage = '';
  private brand: SlotBrand = {};

  static get observedAttributes() {
    return [
      'checkout-id',
      'checkout-updated-date',
      'selected-delivery-option-carrier-id',
      'selected-delivery-option-id',
      'delivery-step-state',
      'slot-brand',
    ];
  }

  connectedCallback() {
    window.addEventListener('message', this.handleFoxpostMessage);
    this.readBrand();
    void this.syncSelectionFromCart();
    this.render();
  }

  disconnectedCallback() {
    window.removeEventListener('message', this.handleFoxpostMessage);
  }

  attributeChangedCallback(name: string) {
    if (name === 'slot-brand') {
      this.readBrand();
    }

    if (name === 'selected-delivery-option-id' || name === 'checkout-updated-date') {
      void this.syncSelectionFromCart();
    }

    this.applyContinueState();
    this.render();
  }

  onRefreshCheckout(callback: () => Promise<void>) {
    this.refreshCheckoutCallback = callback;
  }

  disableContinueButton(callback: (isDisabled: boolean) => void) {
    this.continueButtonCallback = callback;
    this.applyContinueState();
  }

  private get isFoxpostSelected(): boolean {
    const optionId = this.getAttribute('selected-delivery-option-id') || '';
    const carrierId = this.getAttribute('selected-delivery-option-carrier-id') || '';

    return (
      carrierId === FOXPOST_CARRIER_APP_ID ||
      optionId === FOXPOST_OPTION_ID ||
      optionId.startsWith(`${FOXPOST_OPTION_ID}:`)
    );
  }

  private get deliveryStepState(): string {
    return this.getAttribute('delivery-step-state') || 'open';
  }

  private readBrand() {
    const raw = this.getAttribute('slot-brand');

    if (!raw) {
      this.brand = {};
      return;
    }

    try {
      this.brand = JSON.parse(raw);
    } catch {
      this.brand = {};
    }
  }

  private applyContinueState() {
    if (!this.continueButtonCallback) {
      return;
    }

    const shouldDisable =
      this.isFoxpostSelected &&
      (!this.selectedPoint || this.saving || Boolean(this.errorMessage));

    this.continueButtonCallback(shouldDisable);
  }

  private async syncSelectionFromCart() {
    if (!this.isFoxpostSelected) {
      this.applyContinueState();
      return;
    }

    try {
      const response = await currentCartV2.getCurrentCart();
      const address = response.cart?.deliveryInfo?.address;
      const addressLine2 = address?.addressLine2 || '';
      const match = addressLine2.match(/FOXPOST\s+([A-Z0-9-]+)/i);

      if (!match) {
        this.selectedPoint = null;
        this.pickerOpen = true;
      } else {
        const label = addressLine2.replace(/\s*[·|-]\s*FOXPOST\s+[A-Z0-9-]+.*$/i, '').trim();

        this.selectedPoint = {
          operator_id: match[1],
          name: label || 'FOXPOST átvételi pont',
          zip: address?.postalCode,
          city: address?.city,
          street: [
            address?.streetAddress?.name,
            address?.streetAddress?.number,
          ].filter(Boolean).join(' '),
          country: address?.country,
        };
        this.pickerOpen = false;
      }

      this.errorMessage = '';
    } catch (error) {
      console.error('FOXPOST: current cart sync failed', error);
    }

    this.applyContinueState();
    this.render();
  }

  private handleFoxpostMessage = (event: MessageEvent) => {
    if (event.origin !== FOXPOST_ORIGIN) {
      return;
    }

    let point: FoxpostPoint;

    try {
      point = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    } catch {
      return;
    }

    if (
      !point ||
      !point.operator_id ||
      !point.name ||
      !point.zip ||
      !point.city ||
      !point.street
    ) {
      return;
    }

    void this.selectPoint(point);
  };

  private async selectPoint(point: FoxpostPoint) {
    this.saving = true;
    this.errorMessage = '';
    this.selectedPoint = point;
    this.applyContinueState();
    this.render();

    try {
      const street = splitStreet(point.street || '');
      const operatorId = String(point.operator_id || '').toUpperCase();
      const pointName = String(point.name || '').trim();

      const address = {
        streetAddress: {
          name: street.name,
          ...(street.number ? { number: street.number } : {}),
        },
        city: String(point.city || '').trim(),
        country: String(point.country || 'HU').toUpperCase(),
        postalCode: String(point.zip || '').trim(),
        addressLine2: `${pointName} · FOXPOST ${operatorId}`,
      };

      await currentCartV2.updateCurrentCart({
        deliveryInfo: {
          address,
        },
      });

      this.selectedPoint = point;
      this.pickerOpen = false;

      if (this.refreshCheckoutCallback) {
        await this.refreshCheckoutCallback();
      }
    } catch (error) {
      console.error('FOXPOST: pickup point save failed', error);
      this.errorMessage = 'Nem sikerült elmenteni az átvételi pontot. Kérjük, próbáld újra.';
      this.pickerOpen = true;
    } finally {
      this.saving = false;
      this.applyContinueState();
      this.render();
    }
  }

  private renderSelectedSummary(): string {
    if (!this.selectedPoint) {
      return '';
    }

    const point = this.selectedPoint;
    const address = [point.zip, point.city, point.street].filter(Boolean).join(' ');

    return `
      <div style="
        display:flex;
        gap:12px;
        align-items:flex-start;
        padding:14px;
        border:1px solid ${this.brand.selectionColor || '#6fce45'};
        border-radius:${this.brand.cornerRadius ?? 8}px;
      ">
        <div style="font-size:20px;line-height:1;">✓</div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;">${escapeHtml(point.name || 'FOXPOST átvételi pont')}</div>
          <div style="margin-top:4px;font-size:13px;opacity:.8;">${escapeHtml(address)}</div>
          <div style="margin-top:3px;font-size:12px;opacity:.65;">FOXPOST ${escapeHtml(String(point.operator_id || '').toUpperCase())}</div>
        </div>
        ${this.deliveryStepState === 'open' ? `
          <button id="foxpost-change-point" type="button" style="
            border:0;
            background:transparent;
            color:${this.brand.textColor || '#111'};
            text-decoration:underline;
            cursor:pointer;
            font:inherit;
            padding:2px 0;
          ">Módosítás</button>
        ` : ''}
      </div>
    `;
  }

  render() {
    if (!this.isFoxpostSelected) {
      this.innerHTML = '';
      this.applyContinueState();
      return;
    }

    const background = this.brand.backgroundColor || '#ffffff';
    const textColor = this.brand.textColor || '#111111';
    const buttonColor = this.brand.buttonColor || '#111111';
    const buttonTextColor = this.brand.buttonTextColor || '#ffffff';
    const radius = this.brand.cornerRadius ?? 8;

    const showPicker = this.deliveryStepState === 'open' && (this.pickerOpen || !this.selectedPoint);

    this.innerHTML = `
      <div style="background:${background};color:${textColor};padding:12px 0;">
        <div style="
          background:${background};
          color:${textColor};
          border-radius:${radius}px;
          border:1px solid rgba(127,127,127,.25);
          overflow:hidden;
        ">
          <div style="padding:16px;">
            <div style="font-size:16px;font-weight:700;">FOXPOST átvételi pont</div>
            <div style="margin-top:4px;font-size:13px;opacity:.75;">
              Válassz automatát vagy átvételi pontot. A kiválasztott cím automatikusan bekerül a rendelés szállítási adataiba.
            </div>
          </div>

          ${this.selectedPoint ? `<div style="padding:0 16px 16px;">${this.renderSelectedSummary()}</div>` : ''}

          ${this.errorMessage ? `
            <div style="margin:0 16px 16px;padding:12px;border-radius:${radius}px;background:#fff1f1;color:#8a1111;font-size:13px;">
              ${escapeHtml(this.errorMessage)}
            </div>
          ` : ''}

          ${this.saving ? `
            <div style="padding:0 16px 16px;font-size:13px;opacity:.75;">Átvételi pont mentése…</div>
          ` : ''}

          ${showPicker ? `
            <div style="padding:0 16px 16px;">
              <iframe
                title="FOXPOST átvételi pont választó"
                src="${FOXPOST_PICKER_URL}"
                loading="lazy"
                style="
                  width:100%;
                  height:520px;
                  display:block;
                  border:0;
                  border-radius:${radius}px;
                  background:${background};
                "
              ></iframe>
            </div>
          ` : ''}

          ${!showPicker && !this.selectedPoint ? `
            <div style="padding:0 16px 16px;">
              <button id="foxpost-open-picker" type="button" style="
                width:100%;
                border:0;
                border-radius:${radius}px;
                background:${buttonColor};
                color:${buttonTextColor};
                padding:12px 16px;
                cursor:pointer;
                font:inherit;
                font-weight:700;
              ">Átvételi pont kiválasztása</button>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    this.querySelector('#foxpost-change-point')?.addEventListener('click', () => {
      this.pickerOpen = true;
      this.render();
    });

    this.querySelector('#foxpost-open-picker')?.addEventListener('click', () => {
      this.pickerOpen = true;
      this.render();
    });

    this.applyContinueState();
  }
}

export default NutriAFoxpostCheckout;
