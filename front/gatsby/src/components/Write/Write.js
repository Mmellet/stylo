import React, {useEffect,useState,useRef} from 'react'
import { connect } from 'react-redux'
import { navigate } from 'gatsby'

import askGraphQL from '../../helpers/graphQL';
import styles from './write.module.scss'

import WriteLeft from './WriteLeft'
import WriteRight from './WriteRight'
import Compare from './Compare'
import CompareSelect from './CompareSelect'

import useDebounce from '../../hooks/debounce'

//import _ from 'lodash'

let CodeMirror = () => (<p>No window</p>)
if (typeof window !== `undefined` && typeof navigator !== `undefined`) {
  const {Controlled} = require("react-codemirror2")
  require('codemirror/mode/markdown/markdown');
  CodeMirror = Controlled
}

const mapStateToProps = ({ logedIn, sessionToken, activeUser }) => {
  return { logedIn, sessionToken, activeUser  }
}

const ConnectedWrite = (props) => {
/*   if(!props.logedIn){
    navigate('/login')
    return (<p>Redirecting...</p>)
  } */
  const readOnly = props.version? true:false;
  const query = "query($article:ID!){article(article:$article){ _id title zoteroLink owners{ displayName } versions{ _id version revision message autosave updatedAt owner{ displayName }} "
  const getLive = "live{ md bib yaml message owner{ displayName }} } }"
  const getVersion = `} version(version:"${props.version}"){ _id md bib yaml message revision version owner{ displayName }} }`

  const fullQuery = props.version?query + getVersion:query + getLive

  let instanceCM = useRef(null);

  const setCodeMirrorCursor = (line) => {
    try{
      const editor = instanceCM.current.editor
      editor.focus();
      editor.execCommand('goDocEnd')
      editor.setCursor(line,0)
      editor.execCommand('goLineEnd')
    }
    catch(err){
      console.log('too fast, editor not mounted yet')
    }
    


    //instanceCM.focus();
    //instanceCM.setCursor(line,0);
  } 

  const variables = {user:props.activeUser._id,article:props.id}
  const [isLoading,setIsLoading] = useState(true)
  const [live, setLive] = useState({})
  const [versions, setVersions] = useState([])
  const [articleInfos, setArticleInfos] = useState({title:"",owners:[],zoteroLink:""})
  const [firstLoad,setFirstLoad] = useState(true)
  
  
  
  const sendVersion = async (autosave = true,major = false, message = "") => {
    try{
      const query = `mutation($user:ID!,$article:ID!,$md:String!,$bib:String!,$yaml:String!,$autosave:Boolean!,$major:Boolean!,$message:String){saveVersion(version:{article:$article,major:$major,auto:$autosave,md:$md,yaml:$yaml,bib:$bib,message:$message},user:$user){ _id version revision message autosave updatedAt owner{ displayName }} }`
      const response = await askGraphQL({query,variables:{...variables,...live,autosave,major,message}},'saving new version',props.sessionToken)
      if(versions[0]._id !== response.saveVersion._id){
        setVersions([response.saveVersion,...versions])
      }
      else{
        //Last version had same _id, we gucchi to update!
        const immutableV = [...versions]
        //shift the first item of the array
        const [_,...rest] = immutableV
        setVersions([response.saveVersion,...rest])
      }
      return response
    }
    catch(err){
      alert(err)
    }
  }
  


  //Autosave debouncing on the live
  // TODO: Do not save when opening
  const debouncedLive = useDebounce(live, 1000);
  useEffect(()=>{
    if(!readOnly && !isLoading && !firstLoad){
      sendVersion(true,false, "Autosave")
    }
    if(!readOnly && !isLoading){
      setFirstLoad(false)
    }
    else{
      setFirstLoad(true)
    }
  },[debouncedLive])
  
  
  const handleMDCM = async (___, __, md)=>{
    await setLive({...live,md:md})
  }
  const handleYaml = async (yaml) => {
    await setLive({...live,yaml:yaml})
  }
  const handleBib = async (bib) => {
    await setLive({...live,bib:bib})
  }
  
  //Reload when version switching
  useEffect(()=>{
    (async () => {
      setIsLoading(true)
      const data = await askGraphQL({query:fullQuery,variables},'fetching Live version',props.sessionToken)
      setLive(props.version?data.version:data.article.live)
      setArticleInfos({_id:data.article._id,title:data.article.title,zoteroLink:data.article.zoteroLink,owners:data.article.owners.map(o => o.displayName)})
      setVersions(data.article.versions)
      setIsLoading(false)
    })()
  },[props.version])

  return (
    <section className={styles.container}>
      {!isLoading && <WriteLeft article={articleInfos} {...live} compareTo={props.compareTo} selectedVersion={props.version} versions={versions} readOnly={readOnly} sendVersion={sendVersion} handleBib={handleBib} setCodeMirrorCursor={setCodeMirrorCursor} />}
      {!isLoading && <WriteRight {...live} handleYaml={handleYaml} readOnly={readOnly}/>}
  
      {props.compareTo && <CompareSelect live={live} {...props} versions={versions} readOnly={readOnly} article={articleInfos} selectedVersion={props.version}/>}
      <article className={styles.article}>
        {isLoading && <p>Loading...</p>}
        {!isLoading && <>
          {readOnly && <pre>{live.md}</pre>}
          {!readOnly && <CodeMirror value={live.md} onBeforeChange={handleMDCM} options={{mode:'markdown',lineWrapping:true,viewportMargin:Infinity,autofocus:true,spellcheck:true,extraKeys:{"Shift-Ctrl-Space": function(cm) {cm.replaceSelection("\u00a0");}}}} ref={instanceCM}/>}
          {props.compareTo && <Compare {...props} live={live} />}
        </>}
      </article>
    </section>
  )
}

const Write = connect(
  mapStateToProps
)(ConnectedWrite)

export default Write