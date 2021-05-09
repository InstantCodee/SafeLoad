import { useForm } from 'react-hook-form';
import {  } from 'openpgp';
import { random } from '../lib/random';
import { Settings } from '@prisma/client';

function HomePage({ c }) {
    const config = c as Settings;
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();
    
    const onSubmit = async (data) => {
        // User did not provide any password, so we create one.
        if (data.password === "") {
            data.password = random(32);
        }

        console.log(data);
        
        const res = await fetch(`http://localhost:3000/api/file`, {
            method: 'post',
            body: JSON.stringify({
                password: data.password,
                filename: data.file[0].name,
                maxDownload: Number(data.maxDownload),
                expireAt: data.expireAt,
                emails: data.emails,
                message: data.message
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await res.json()
    };    

    const messagePlaceholder = `Message (max ${config.maxMsgSize} characters)`

    return <div>
        <h2>Ready to upload some data?</h2>
        <form action="/api/file" method="POST" onSubmit={handleSubmit(onSubmit)}>
            <input type='file' {...register('file')} /><br />
            <input type="password" placeholder="Password" {...register('password')} /><br />
            <input type="number" placeholder="Max. Downloads" {...register('maxDownload')} /><br />
            <input type="number" placeholder="Expire (days)" {...register('expireAt')} /><br />
            <input type="text" placeholder="E-Mails" {...register('emails')} /><br />
            {errors.message && <p>Your message can only have {config.maxMsgSize} characters at maximum.</p>}
            <input type="text" placeholder={messagePlaceholder} {...register('message', { maxLength: 200 })} /><br /><br />
            <button type="submit">Share</button>
        </form>
    </div>
}

export const getServerSideProps = async context => {
    const req = await fetch(`http://localhost:3000/api/config`);
    
    return {
        props: {
            c: await req.json()
        }
    }
}

export default HomePage