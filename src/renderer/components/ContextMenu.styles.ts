import styled from 'styled-components';

export const Container = styled.div`
  .popup {
    animation-name: fadeIn;
    animation-duration: 0.4s;
    background-clip: padding-box;
    background-color: #23292b;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    left: 0px;
    list-style-type: none;
    margin: 0;
    outline: none;
    padding: 0;
    position: absolute;
    text-align: left;
    font-size: 2em;
    top: 0px;
    overflow: hidden;
    -webkit-box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

    li {
      clear: both;
      color: #eeeeee;
      cursor: pointer;
      font-size: 14px;
      font-weight: normal;
      line-height: 22px;
      margin: 0;
      padding: 10px 30px;
      transition: all 0.3s;
      white-space: nowrap;
      -webkit-transition: all 0.3s;
    }

    li:hover {
      background-color: #464849;
    }

    li > i {
      margin-right: 8px;
    }
  }
`;
