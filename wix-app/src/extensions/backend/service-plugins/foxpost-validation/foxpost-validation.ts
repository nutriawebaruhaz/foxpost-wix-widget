import { validations } from '@wix/ecom/service-plugins';
import { shouldBlockFoxpostCheckout } from '../../../../lib/foxpost-core';

export default validations.provideHandlers({
  getValidationViolations: async ({ request }) => {
    const validationInfo = request.validationInfo;
    const selectedCode =
      validationInfo?.shippingInfo?.selectedCarrierServiceOption?.code;

    if (
      !shouldBlockFoxpostCheckout(
        selectedCode,
        validationInfo?.shippingAddress?.address
      )
    ) {
      return { violations: [] };
    }

    return {
      violations: [
        {
          severity: validations.Severity.ERROR,
          target: {
            other: {
              name: validations.NameInOther.OTHER_DEFAULT,
            },
          },
          description:
            'Foxpost szállításnál válassz csomagautomatát vagy átvételi pontot a folytatáshoz.',
        },
      ],
    };
  },
});
