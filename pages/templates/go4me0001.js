import Head from 'next/head'
import Image from 'next/image'
import styles from '../../styles/Home.module.css'

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

  var fontSize = 32;
  switch (username.length) {
    case 10:
      fontSize = 30;
      break;
    case 11:
      fontSize = 28;
      break;
    case 12:
      fontSize = 26;
      break;
    case 13:
      fontSize = 24;
      break;
    case 14:
      fontSize = 22;
      break;
    case 15:
      fontSize = 20;
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
          <Image src="/templates/pfp0001.png" height={300} width={300} alt="PFP template" />
          <div style={{
            position: 'absolute',
            width: '290px', 
            top: '187px', 
            height: '40px', 
            fontFamily: 'Inter-Variable', 
            fontSize: props.fontSize + 'px', 
            textAlign: 'center', 
            lineHeight: '40px'
            }}>
            {props.username}
            <div style={{
              position: 'relative',
              top: '2px',
              fontFamily: 'monospace',
              fontSize: '6px',
              lineHeight: '6px',
              color: 'gray',
            }}>tweetid {props.tweetid} on {props.tweetDate}</div>
            <div style={{
              position: 'relative',
              top: '-220px',
              fontFamily: 'Apostrof-Regular',
              fontSize: '32px',
            }}>go4.me</div>
          </div>
        </div>
      </main>
    </div>
  )
}
