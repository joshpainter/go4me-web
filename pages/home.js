import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'

export async function getServerSideProps(context) {
  context.res.setHeader(
    'Cache-Control',
    'public, s-maxage=10, stale-while-revalidate=59'
  );

  return {
    props: {}
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
        <h1 className={styles.title}>
          not yet. soon.
        </h1>
      </main>
      <footer className={styles.footer}>
      </footer>
    </div>
  )
}
