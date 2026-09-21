import { validations } from '@wix/ecom/service-plugins';

const FOXPOST_CODE = 'foxpost_pickup';
const FOXPOST_POINT_MARKER = /(?:^|[·|\s])FOXPOST\s+[A-Z0-9-]+/i;

function hasFoxpostPoint(validationInfo: any): boolean {
  const address = validationInfo?.shippingAddress?.address;
  return FOXPOST_POINT_MARKER.test(String(address?.addressLine2 || ''));
}

export default validations.provideHandlers({
  getValidationViolations: async ({ request }) => {
    const validationInfo = request.validationInfo;
    const selectedCode =
      validationInfo?.shippingInfo?.selectedCarrierServiceOption?.code || '';

    if (selectedCode !== FOXPOST_CODE) {
      return { violations: [] };
    }

    if (hasFoxpostPoint(validationInfo)) {
      return { violations: [] };
    }

    return {
      violations: [
        {
          severity: 'ERROR',
          target: {
            other: {
              name: 'OTHER_DEFAULT',
            },
          },
          description:
            'FOXPOST szállításnál válassz csomagautomatát vagy átvételi pontot a folytatáshoz.',
        },
      ],
    };
  },
});
