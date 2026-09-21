import { extensions } from '@wix/astro/builders';

export default extensions.sitePlugin({
  id: '8c09c67c-c313-433c-9a62-1ce29f5bd414',
  name: 'foxpost-checkout',
  marketData: {
    name: 'FOXPOST átvételi pont',
    description: 'FOXPOST automata és átvételi pont választó a checkout szállítási lépésében.',
  },
  placements: [
    {
      appDefinitionId: '1380b703-ce81-ff05-f115-39571d94dfcd',
      widgetId: '14fd5970-8072-c276-1246-058b79e70c1a',
      slotId: 'checkout:delivery-step:options:after',
    },
  ],
  installation: {
    autoAdd: false,
  },
  tagName: 'nutri-a-foxpost-checkout',
  element: './extensions/site/plugins/foxpost-checkout/foxpost-checkout.tsx',
  settings: './extensions/site/plugins/foxpost-checkout/foxpost-checkout.panel.tsx',
});
