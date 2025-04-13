import classes from './Footer.module.css';
import { useEffect } from 'react';

const { logger } = window.Main;

type FooterProps = {
  msg: string;
};

const Footer = ({ msg }: FooterProps) => {
  return (
    <div className={classes.footerRoot}>
      <p>{msg}</p>
    </div>
  );
};

export default Footer;
