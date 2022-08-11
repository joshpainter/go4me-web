import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import { Search, Grid, Header, Segment, Container } from 'semantic-ui-react'

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
      <Container textAlign='center'>
        <Segment padded='very' basic>
          <Header size='huge' style={{fontFamily: 'Apostrof-Regular', fontSize: '100px'}}>go4.me</Header>
        </Segment>
      </Container>
      <Container textAlign='center'>
          <Search fluid size='massive' />
      </Container>
      <Container textAlign='center'>
        <Segment padded='very' basic>
          <Header size='huge'>more Soon(tm)</Header>
        </Segment>
      </Container>
    </div>
  )
}
