import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {
  labBooking,labDecision,labLogin,labLogout,labRegister,labSnapshot,labTutors,
  LabHttpError,type LabRole,type LabSnapshot,type LabTutor,
} from './lab-client';
import {isApiConfigured} from './api';

const SUBJECTS=['matematicas','ingles','ciencias','programacion','humanidades'];
const ROLES:{value:LabRole;label:string}[]=[
  {value:'adult',label:'Adulto'},{value:'guardian',label:'Responsable (pendiente)'},
  {value:'tutor',label:'Docente (sin verificar)'},
];
function ErrorText({message}:{message:string}) {
  return <Text style={styles.notice} accessibilityRole="alert">{message}</Text>;
}
export default function LabAccounts() {
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const [role,setRole]=useState<LabRole>('adult');
  const [subject,setSubject]=useState('matematicas');
  // Sesión intencionalmente solo en memoria. No usar AsyncStorage ni persistir tokens aquí.
  const [token,setToken]=useState<string|null>(null);
  const [data,setData]=useState<LabSnapshot|null>(null);
  const [tutors,setTutors]=useState<LabTutor[]>([]);
  const [tutorId,setTutorId]=useState(0);
  const [message,setMessage]=useState('Cree cuentas y reservas exclusivamente ficticias.');
  const [working,setWorking]=useState(false);

  const refresh=useCallback(async(authToken:string)=>{
    try{
      const [snapshot,allTutors]=await Promise.all([labSnapshot(authToken),labTutors(authToken)]);
      setData(snapshot);
      setTutors(allTutors);
      setTutorId(previous=>allTutors.some(t=>t.id===previous)?previous:(allTutors[0]?.id??0));
    }catch(error){
      if(error instanceof LabHttpError&&error.status===401){
        setToken(null);setData(null);setTutors([]);
        setMessage('Sesión revocada o expirada. Ingrese nuevamente.');
      } else setMessage(error instanceof Error?error.message:'No se puede conectar a la API local.');
    }
  },[]);

  useEffect(()=>{
    if(!token)return;
    void refresh(token);
    const timer=setInterval(()=>{if(!working)void refresh(token);},4000);
    return ()=>clearInterval(timer);
  },[token,working,refresh]);

  const signup=async()=>{
    setWorking(true);
    try{
      await labRegister(username,password,role,subject);
      setMessage('Alias ficticio creado. Ahora ingrese con la misma contraseña.');
      setPassword('');
    }catch(error){setMessage(error instanceof Error?error.message:'No se pudo crear alias.');}
    finally{setWorking(false);}
  };

  const login=async()=>{
    setWorking(true);
    try{
      const response=await labLogin(username,password);
      setPassword('');setData(null);setToken(response.token);
      setMessage('Sesión local de prueba iniciada. Sin validación de identidad real.');
    }catch(error){setMessage(error instanceof Error?error.message:'Ingreso fallido.');}
    finally{setWorking(false);}
  };

  const logout=async(all=false)=>{
    setWorking(true);
    try{if(token)await labLogout(token,all);}
    catch(error){setMessage(error instanceof Error?error.message:'Error al cerrar sesión.');}
    finally{
      setToken(null);setData(null);setTutors([]);setPassword('');
      setWorking(false);
      setMessage('Sesión local finalizada. No se guardaron credenciales en el teléfono.');
    }
  };

  const command=async(op:()=>Promise<void>)=>{
    if(!token||!data||working)return;
    setWorking(true);
    try{
      await op();
      setMessage('Acción ficticia sincronizada con la web y los otros clientes locales.');
    }catch(error){setMessage(error instanceof Error?error.message:'Operación fallida.');}
    finally{
      setWorking(false);
      if(token)await refresh(token);
    }
  };

  if(!isApiConfigured())return <View style={styles.panel}>
    <Text style={styles.heading}>Cuentas de prueba</Text>
    <ErrorText message="Para usar el laboratorio configure EXPO_PUBLIC_VLC_API_URL y ejecute npm run dev:sync en su equipo." />
  </View>;
  return <View style={styles.panel}>
    <Text style={styles.heading}>Cuentas y agenda privadas</Text>
    <Text style={styles.subtitle}>Laboratorio con alias ficticios. No registre datos reales ni perfiles de menores.</Text>
    <ErrorText message={message}/>
    {!token?<>
      <TextInput style={styles.input} placeholder="Alias inventado" value={username}
        onChangeText={setUsername} autoCapitalize="none" autoCorrect={false}
        accessibilityLabel="Alias de prueba"/>
      <TextInput style={styles.input} placeholder="Contraseña nueva, exclusiva de prueba"
        value={password} onChangeText={setPassword} secureTextEntry
        accessibilityLabel="Contraseña de prueba"/>
      <Text style={styles.label}>Perfil ficticio</Text>
      <View style={styles.wrap}>
        {ROLES.map(option=><Pressable key={option.value}
          style={[styles.chip,role===option.value&&styles.chipActive]}
          onPress={()=>setRole(option.value)} accessibilityRole="button">
          <Text style={role===option.value?styles.activeText:styles.chipText}>{option.label}</Text>
        </Pressable>)}
      </View>
      {role==='tutor'?<View>
        <Text style={styles.label}>Especialidad de prueba</Text>
        <View style={styles.wrap}>{SUBJECTS.map(option=><Pressable key={option}
          style={[styles.chip,subject===option&&styles.chipActive]}
          onPress={()=>setSubject(option)} accessibilityRole="button">
          <Text style={subject===option?styles.activeText:styles.chipText}>{option}</Text>
        </Pressable>)}</View>
      </View>:null}
      <Pressable style={styles.primary} disabled={working} onPress={()=>{void signup();}}>
        <Text style={styles.primaryText}>Crear alias de prueba</Text>
      </Pressable>
      <Pressable style={styles.secondary} disabled={working} onPress={()=>{void login();}}>
        <Text style={styles.secondaryText}>Ingresar con este alias</Text>
      </Pressable>
      {working?<ActivityIndicator/>:null}
    </>:<>
      <Text style={styles.label}>{data?.user.displayName||'Sincronizando cuenta…'}</Text>
      <Text style={styles.subtitle}>Rol: {data?.user.role||'…'} · Verificación: no realizada · Revisión {data?.revision??'—'}</Text>
      <View style={styles.wrap}>
        <Pressable style={styles.secondary} onPress={()=>{void logout();}} disabled={working}>
          <Text style={styles.secondaryText}>Cerrar sesión</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={()=>{void logout(true);}} disabled={working}>
          <Text style={styles.secondaryText}>Revocar sesiones</Text>
        </Pressable>
      </View>
      {data&&data.user.role!=='tutor'?<>
        <Text style={styles.label}>Reservar clase adulta de prueba (+72 h)</Text>
        {tutors.map(t=><Pressable key={t.id}
          style={[styles.chip,tutorId===t.id&&styles.chipActive]} onPress={()=>setTutorId(t.id)}>
          <Text style={tutorId===t.id?styles.activeText:styles.chipText}>{t.displayName}: {t.specialty}</Text>
        </Pressable>)}
        <Pressable style={styles.primary} disabled={!tutorId||working}
          onPress={()=>{void command(()=>labBooking(token,data.revision,tutorId,
            tutors.find(t=>t.id===tutorId)?.specialty||'Tutoría de ejemplo'));}}>
          <Text style={styles.primaryText}>Solicitar reserva ficticia</Text>
        </Pressable>
      </>:null}
      <Text style={styles.label}>Historial privado de esta cuenta</Text>
      {data?.bookings.length===0?<Text style={styles.subtitle}>No hay reservas para esta cuenta ficticia.</Text>:null}
      {data?.bookings.map(b=><View key={b.id} style={styles.booking}>
        <Text style={styles.bookingTitle}>{b.subject} · {b.status}</Text>
        <Text style={styles.subtitle}>{new Date(b.startsAt).toLocaleString('es-CO')}</Text>
        {b.status==='pending'&&data.user.role==='tutor'&&data.user.id===b.tutorId?
        <View style={styles.wrap}>
          <Pressable style={styles.secondary} disabled={working}
            onPress={()=>{void command(()=>labDecision(token,data.revision,b.id,'accept'));}}>
            <Text style={styles.secondaryText}>Aceptar</Text>
          </Pressable>
          <Pressable style={styles.secondary} disabled={working}
            onPress={()=>{void command(()=>labDecision(token,data.revision,b.id,'reject'));}}>
            <Text style={styles.secondaryText}>Rechazar</Text>
          </Pressable>
        </View>:null}
        {['pending','confirmed'].includes(b.status)?
        <Pressable style={styles.secondary} disabled={working}
          onPress={()=>{void command(()=>labDecision(token,data.revision,b.id,'cancel'));}}>
          <Text style={styles.secondaryText}>Cancelar</Text>
        </Pressable>:null}
      </View>)}
    </>}
  </View>;
}
const styles=StyleSheet.create({
  panel:{padding:17,backgroundColor:'#fff',borderRadius:14,borderWidth:1,borderColor:'#dce7ec'},
  heading:{fontSize:20,fontWeight:'800',color:'#15384f'},
  subtitle:{fontSize:12,lineHeight:19,color:'#617c8c',marginTop:8,marginBottom:12},
  notice:{fontSize:12,color:'#8a5a14',marginTop:12,marginBottom:14},
  label:{fontSize:13,fontWeight:'800',color:'#234e65',marginVertical:12},
  input:{borderWidth:1,borderColor:'#cedce5',borderRadius:10,padding:12,marginVertical:6,color:'#15384f'},
  wrap:{flexDirection:'row',flexWrap:'wrap',gap:7,marginBottom:10},
  chip:{borderRadius:10,borderColor:'#cbdce4',borderWidth:1,padding:10,marginBottom:4},
  chipActive:{backgroundColor:'#143f5a'},
  chipText:{fontSize:12,color:'#315971'},
  activeText:{fontSize:12,color:'#fff'},
  primary:{backgroundColor:'#174a63',padding:13,borderRadius:10,marginTop:10,alignItems:'center'},
  primaryText:{color:'#fff',fontWeight:'800'},
  secondary:{backgroundColor:'#e8f3f7',borderRadius:10,padding:11,marginTop:7,alignSelf:'flex-start'},
  secondaryText:{fontSize:12,color:'#13516b',fontWeight:'700'},
  booking:{backgroundColor:'#f4f8fa',padding:12,borderRadius:10,marginBottom:11},
  bookingTitle:{fontWeight:'800',fontSize:13,color:'#17445b'},
});
