import CreateImageHouse from "./CreateImageHouse"

const page = () => {
  return (
    <>
      <h1 className="text-2xl font-heading text-primary">Tạo ảnh nhà lẻ</h1>
      <p className="text-muted-foreground">Tạo ảnh nhà lẻ cho các nhà lẻ đã có sẵn.</p>
      <CreateImageHouse />
    </>
  )
}

export default page