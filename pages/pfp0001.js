import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'

export async function getServerSideProps(context) {
  context.res.setHeader(
    'Cache-Control',
    'public, s-maxage=10, stale-while-revalidate=59'
  );

  const username = context.req.headers.host.replace(/\..*/g, '');
  
  if (username.length < 4 || username.length > 15) {
    return {
      notFound: true
    }      
  }

  var fontSize = 33;
  switch (username.length) {
    case 10:
      fontSize = 31;
      break;
    case 11:
      fontSize = 29;
      break;
    case 12:
      fontSize = 27;
      break;
    case 13:
      fontSize = 25;
      break;
    case 14:
      fontSize = 23;
      break;
    case 15:
      fontSize = 30;
      break;
    default:
      break;
  }

  return {
    props: {
      username: '@' + username,
      tweetid: 1556785618750955520,
      tweetDate: (new Date()).toUTCString(),
      fontSize: fontSize
    }
  }
  
}

export default function Pfp0001(props) {
  return (
    <div>
      <Head>
        <title>go4.me</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <div>
          <img src="/pfp0001.png" height="300" width="300" />
          <div style={{
            position: 'absolute',
            width: '290px', 
            top: '185px', 
            height: '40px', 
            fontFamily: 'Apostrof-Regular', 
            fontSize: props.fontSize + 'px', 
            textAlign: 'center', 
            lineHeight: '40px'
            }}>
            {props.username}
            <div style={{
              position: 'relative',
              top: '2px',
              fontSize: '6px',
              lineHeight: '11px',
              color: 'gray',
            }}>tweetid {props.tweetid} on {props.tweetDate}</div>
          </div>
        </div>
      </main>
    </div>
  )
}
