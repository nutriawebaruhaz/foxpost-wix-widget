import React, { type FC } from 'react';
import {
  SidePanel,
  Text,
  WixDesignSystemProvider,
} from '@wix/design-system';
import '@wix/design-system/styles.global.css';

const Panel: FC = () => (
  <WixDesignSystemProvider>
    <SidePanel width="300" height="100vh">
      <SidePanel.Content noPadding stretchVertically>
        <SidePanel.Field>
          <Text>
            A Foxpost checkout plugin beállításai a Nutri-A alkalmazásból kezelhetők.
          </Text>
        </SidePanel.Field>
      </SidePanel.Content>
    </SidePanel>
  </WixDesignSystemProvider>
);

export default Panel;
