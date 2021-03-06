import { TextInput } from './TextInput.jsx';
import React from 'react';

export function Dossier(props){
  return(
    <section>
      <h1><i className="fa fa-users" aria-hidden="true"></i> Dossier</h1>
        <TextInput target={"dossier[0].title_f"} alias={[{target:'dossier[0].title',prefix:'',suffix:'',filterMD:true}]} title="Titre du dossier"  state={props.state} updateState={props.updateState} readOnly={props.readOnly}/>
        <TextInput target={"dossier[0].id"} title="Id du dossier"  state={props.state} updateState={props.updateState} readOnly={props.readOnly}/>
    </section>
  )
}
