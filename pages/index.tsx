import { useForm } from 'react-hook-form';

function HomePage() {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();
    const onSubmit = async (data) => {
        console.log(data);
        
        const res = await fetch(`http://localhost:3000/api/file`, {
            method: 'post',
            body: JSON.stringify({
                filename: data.file[0].name,
                password: data.password,
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

    const onSubmitForm = async values => {
        console.log(values);

        /**/
    }

    return <div>
        <h2>Ready to upload some data?</h2>
        <form action="/api/file" method="POST" onSubmit={handleSubmit(onSubmit)}>
            <input type='file' {...register('file')} /><br />
            <input type="password" placeholder="Password" {...register('password')} /><br />
            <input type="number" placeholder="Max. Downloads" {...register('maxDownload')} /><br />
            {errors.age && <p>Please enter number for age.</p>}
            <input type="number" placeholder="Expire (days)" {...register('expireAt')} /><br />
            <input type="text" placeholder="E-Mails" {...register('emails')} /><br />
            <input type="text" placeholder="Message" {...register('message')} /><br /><br />
            <button type="submit">Send</button>
        </form>
    </div>
}

export default HomePage