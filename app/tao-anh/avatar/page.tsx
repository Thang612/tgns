import CreateAvatar from "./CreateAvatar"

const page = () => {
    return (
        <>
            <h1 className="text-2xl font-heading text-primary">Avatar</h1>
            <p className="text-muted-foreground">Tạo ảnh đại diện cho thế giới nhà sang.</p>
            <CreateAvatar />
        </>
    )
}

export default page