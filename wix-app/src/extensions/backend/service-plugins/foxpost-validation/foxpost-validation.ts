import { validations } from '@wix/ecom/service-plugins';
import {
  FOXPOST_CODE,
  isFoxpostDeliveryAddress,
} from '../../../../lib/foxpost-core';

export default validations.provideHandlers({
  getValidationViolations: async ({ request }) => {
    const validationInfo = request.validationInfo;
    const selectedCode =
      validationInfo?.shippingInfo?.selectedCarrierServiceOption?.code || '';

    if (selectedCode !== FOXPOST_CODE) {
      return { violations: [] };
    }

    if (isFoxpostDeliveryAddress(validationInfo?.shippingAddress?.address)) {
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
            'FOXPOST szállításnál válassz csomagautomatát vagy átvételi pontot a folytatáshoz.',
        },
      ],
    };
  },
});
