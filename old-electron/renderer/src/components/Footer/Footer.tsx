import classes from './Footer.module.css';

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
