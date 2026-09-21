import React, { useState } from 'react';
import { dashboard } from '@wix/dashboard';
import {
  Box,
  Button,
  Card,
  Page,
  Text,
  WixDesignSystemProvider,
} from '@wix/design-system';
import '@wix/design-system/styles.global.css';

const PLUGIN_ID = '8c09c67c-c313-433c-9a62-1ce29f5bd414';

const PLACEMENT = {
  appDefinitionId: '1380b703-ce81-ff05-f115-39571d94dfcd',
  widgetId: '14fd5970-8072-c276-1246-058b79e70c1a',
  slotId: 'checkout:delivery-step:options:after',
};

export default function FoxpostSetupPage() {
  const [adding, setAdding] = useState(false);

  const addPlugin = async () => {
    setAdding(true);

    try {
      await dashboard.addSitePlugin(PLUGIN_ID, {
        placement: PLACEMENT,
      });

      dashboard.showToast({
        message: 'A FOXPOST checkout plugin hozzáadásra került.',
        type: 'success',
      });
    } catch (error) {
      console.error('FOXPOST plugin add failed', error);

      dashboard.showToast({
        message: 'A plugin nem került hozzáadásra. Lehet, hogy már telepítve van.',
        type: 'warning',
      });
    } finally {
      setAdding(false);
    }
  };

  return (
    <WixDesignSystemProvider>
      <Page>
        <Page.Header title="FOXPOST Checkout" />
        <Page.Content>
          <Card>
            <Card.Header title="Checkout integráció" />
            <Card.Content>
              <Box direction="vertical" gap="SP3">
                <Text>
                  A FOXPOST átvételi pont választó a checkout szállítási opciói alatt jelenik meg.
                </Text>
                <Text secondary>
                  A gomb csak kiadott appverzió után használható. Fejlesztés közben ne add hozzá az élő checkouthoz.
                </Text>
                <Box>
                  <Button onClick={addPlugin} disabled={adding}>
                    {adding ? 'Hozzáadás…' : 'FOXPOST plugin hozzáadása'}
                  </Button>
                </Box>
              </Box>
            </Card.Content>
          </Card>
        </Page.Content>
      </Page>
    </WixDesignSystemProvider>
  );
}
