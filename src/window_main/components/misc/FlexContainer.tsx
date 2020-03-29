import styled from "styled-components";

export const FlexContainer = styled.div`
  display: flex;
  align-items: center;
  div {
    margin: auto 4px;
  }
`;

export const FlexLeftContainer = styled(FlexContainer)`
  justify-content: flex-start;
  margin-right: auto;
  div {
    :first-child:not(.deck_tag_close) {
      margin-left: 0;
    }
    :last-child:not(.deck_tag_close) {
      margin-right: auto;
    }
  }
`;

export const FlexCenterContainer = styled(FlexContainer)`
  justify-content: center;
  margin-left: auto;
  margin-right: auto;
  div {
    :first-child:not(.deck_tag_close) {
      margin-left: auto;
    }
    :last-child:not(.deck_tag_close) {
      margin-right: auto;
    }
  }
`;

export const FlexRightContainer = styled(FlexContainer)`
  justify-content: flex-end;
  margin-left: auto;
  div {
    :first-child:not(.deck_tag_close) {
      margin-left: auto;
    }
  }
`;
