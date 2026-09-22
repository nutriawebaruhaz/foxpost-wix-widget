import { validations } from '@wix/ecom/service-plugins';

export default validations.provideHandlers({
  getValidationViolations: async () => {
    /**
     * Do not block the checkout here.
     *
     * Wix can invoke eCommerce validations before the delivery-method step is
     * opened. If Foxpost was selected earlier (for example on the cart page),
     * a blocking violation here prevents the buyer from ever reaching the
     * Foxpost pickup-point selector.
     *
     * The checkout Site Plugin is responsible for blocking the delivery-step
     * Continue button with disableContinueButton() until a valid pickup point
     * has been selected.
     */
    return { violations: [] };
  },
});
