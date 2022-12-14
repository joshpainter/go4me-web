import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'

export async function getServerSideProps(context) {
  context.res.setHeader(
    'Cache-Control',
    'public, s-maxage=10, stale-while-revalidate=59'
  );

  const host = context.req.headers.host;

  const domain = host.replace(/\..*/g, '');
    if (domain.length < 4 || domain.length > 15) {
    return {
      notFound: true
    }      
  }

  const axios = require('axios');
  try {
    const res = await axios.get('https://go4me-domains.s3.amazonaws.com/' + domain + '.json');
    return {
      props: res.data
    }
  }
  catch {
    return {
      notFound: true
    }    
  }
}

export default function Home(props) {
  return (
    <div className={styles.container}>
      <Head>
        <title>go4.me</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
      <img src={props.pfpUrls[0]} width='300' height='300' />
      <br/>
        {props.pointers[props.pointers.length - 1].value}
        <h1 className={styles.title}>
          more Soon(tm)
        </h1>
        <a href='/domain.json'>domain.json</a>
      </main>
      <footer className={styles.footer}>
      </footer>
    </div>
  )
}
